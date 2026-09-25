import {AdminModelList} from "@terreno/admin-frontend";
import type React from "react";
import {adminTerrenoApi} from "@/store/sdk";

const AdminListScreen: React.FC = () => {
  return (
    <AdminModelList
      api={adminTerrenoApi}
      baseUrl="/admin"
      configurationPath="/admin/configuration"
    />
  );
};

export default AdminListScreen;
