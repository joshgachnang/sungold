export interface AppOrganizationSettings {
  timezone?: string;
}

declare module "@terreno/api" {
  interface OrganizationSettings extends AppOrganizationSettings {}
}
