import AppKit
import Foundation
import NetworkExtension
import os
import SystemExtensions

/// Installs the filter system extension, turns the content filter on, and keeps its blocked
/// domain list in step with the active session.
@MainActor
final class FilterController: NSObject, ObservableObject {
    enum Status: Equatable {
        case notInstalled
        case waitingForApproval
        case enabled
        case disabled
        case failed(String)
    }

    static let extensionIdentifier = "\(Bundle.main.bundleIdentifier ?? "app.sungold.mac").filter"

    @Published private(set) var status: Status = .notInstalled
    private let logger = Logger(subsystem: "app.sungold.mac", category: "filter")
    private var desiredRules = FilterRules.none
    /// False until the app knows the session state. Until then the filter keeps whatever
    /// list it already has, so launching (offline or not) never lifts a block.
    private var desiredKnown = false
    private var appliedRules: FilterRules?

    /// Checks whether the filter is already configured, without prompting the user.
    func refresh() {
        NEFilterManager.shared().loadFromPreferences { [weak self] error in
            MainActor.assumeIsolated {
                guard let self else { return }
                let manager = NEFilterManager.shared()
                if let error {
                    self.status = .failed(error.localizedDescription)
                } else if manager.providerConfiguration == nil {
                    self.status = .notInstalled
                } else {
                    self.status = manager.isEnabled ? .enabled : .disabled
                    self.appliedRules = FilterRules(vendorConfiguration: manager.providerConfiguration?.vendorConfiguration)
                    self.push()
                    // Already set up: re-submit activation so a newer embedded filter replaces the
                    // installed one. An approved extension from the same team needs no new approval.
                    self.submitActivation()
                }
            }
        }
    }

    /// Installs the system extension (the user approves it in System Settings) and enables it.
    func install() {
        submitActivation()
    }

    private func submitActivation() {
        let request = OSSystemExtensionRequest.activationRequest(
            forExtensionWithIdentifier: Self.extensionIdentifier, queue: .main)
        request.delegate = self
        OSSystemExtensionManager.shared.submitRequest(request)
        logger.info("requested filter extension activation")
    }

    /// Opens System Settings › General › Login Items & Extensions, where the user switches on
    /// the filter under Network Extensions. Approval stays pending until they do.
    static func openApprovalSettings() {
        let url = URL(string: "x-apple.systempreferences:com.apple.LoginItems-Settings.extension")!
        NSWorkspace.shared.open(url)
    }

    /// Sets what the filter enforces: the active session's domains and its grants.
    /// `FilterRules.none` blocks nothing.
    func setRules(_ rules: FilterRules) {
        desiredRules = rules
        desiredKnown = true
        push()
    }

    private func push() {
        guard status == .enabled, desiredKnown, appliedRules != desiredRules else { return }
        let rules = desiredRules
        NEFilterManager.shared().loadFromPreferences { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, let configuration = NEFilterManager.shared().providerConfiguration else { return }
                configuration.vendorConfiguration = rules.vendorConfiguration
                NEFilterManager.shared().providerConfiguration = configuration
                NEFilterManager.shared().saveToPreferences { error in
                    MainActor.assumeIsolated {
                        if let error {
                            self.logger.error("updating filter failed: \(error.localizedDescription, privacy: .public)")
                            return
                        }
                        self.appliedRules = rules
                        self.logger.info("filter blocking domains=\(rules.domains.joined(separator: ","), privacy: .public) grants=\(rules.grants.count)")
                        // A session may have changed while this save was in flight.
                        self.push()
                    }
                }
            }
        }
    }

    private func enableFilter() {
        let manager = NEFilterManager.shared()
        manager.loadFromPreferences { [weak self] error in
            MainActor.assumeIsolated {
                guard let self else { return }
                if let error {
                    self.status = .failed(error.localizedDescription)
                    return
                }
                let configuration = manager.providerConfiguration ?? NEFilterProviderConfiguration()
                configuration.filterSockets = true
                configuration.filterPackets = false
                // Only overwrite the list when the session state is known.
                if self.desiredKnown || configuration.vendorConfiguration == nil {
                    configuration.vendorConfiguration = self.desiredRules.vendorConfiguration
                }
                manager.providerConfiguration = configuration
                manager.localizedDescription = "Sungold"
                manager.isEnabled = true
                // The first save shows the system "allow content filtering" prompt.
                manager.saveToPreferences { error in
                    MainActor.assumeIsolated {
                        if let error {
                            self.status = .failed(error.localizedDescription)
                            self.logger.error("enabling filter failed: \(error.localizedDescription, privacy: .public)")
                        } else {
                            self.status = .enabled
                            self.appliedRules = FilterRules(vendorConfiguration: configuration.vendorConfiguration)
                            self.logger.info("filter enabled")
                            self.push()
                        }
                    }
                }
            }
        }
    }
}

extension FilterController: OSSystemExtensionRequestDelegate {
    nonisolated func request(_ request: OSSystemExtensionRequest,
                             actionForReplacingExtension existing: OSSystemExtensionProperties,
                             withExtension ext: OSSystemExtensionProperties) -> OSSystemExtensionRequest.ReplacementAction {
        .replace
    }

    nonisolated func requestNeedsUserApproval(_ request: OSSystemExtensionRequest) {
        MainActor.assumeIsolated {
            status = .waitingForApproval
            logger.info("filter extension waiting for approval in System Settings")
        }
    }

    nonisolated func request(_ request: OSSystemExtensionRequest,
                             didFinishWithResult result: OSSystemExtensionRequest.Result) {
        MainActor.assumeIsolated {
            logger.info("filter extension activated (result \(result.rawValue))")
            enableFilter()
        }
    }

    nonisolated func request(_ request: OSSystemExtensionRequest, didFailWithError error: Error) {
        MainActor.assumeIsolated {
            status = .failed(error.localizedDescription)
            logger.error("filter extension activation failed: \(error.localizedDescription, privacy: .public)")
        }
    }
}
