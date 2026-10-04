import Foundation

/// URLs come from Config.xcconfig through Info.plist.
struct AppConfig {
    let apiURL: URL
    let webURL: URL

    static let current: AppConfig = {
        let info = Bundle.main.infoDictionary ?? [:]
        let api = (info["SungoldAPIURL"] as? String).flatMap(URL.init(string:))
        let web = (info["SungoldWebURL"] as? String).flatMap(URL.init(string:))
        return AppConfig(
            apiURL: api ?? URL(string: "http://localhost:4093")!,
            webURL: web ?? URL(string: "http://localhost:8093")!)
    }()
}
