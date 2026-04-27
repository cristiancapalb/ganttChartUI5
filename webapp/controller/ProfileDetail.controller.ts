import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import BaseEvent from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import type ResourceBundle from "sap/base/i18n/ResourceBundle";

interface ProfileLevel {
    name: string;
    level: number;
}

interface EmployeeProfile {
    employeeId: string;
    employeeName: string;
    role: string;
    department: string;
    location: string;
    availability: string;
    utilization: number;
    skills: ProfileLevel[];
    technologies: ProfileLevel[];
}

interface EmployeeProfilesData {
    employees: EmployeeProfile[];
}

/**
 * @namespace ganttchartdemo.controller
 */
export default class ProfileDetail extends Controller {
    private employeeId = "";

    public onInit(): void {
        UIComponent.getRouterFor(this).getRoute("RouteProfileDetail")?.attachPatternMatched(this.onRouteMatched.bind(this), this);
    }

    public onNavBack(): void {
        UIComponent.getRouterFor(this).navTo("RouteProfileOverview");
    }

    public formatLevelText(iLevel?: number): string {
        return iLevel ? iLevel + " / 5" : "";
    }

    private onRouteMatched(oEvent: BaseEvent<{ arguments?: { employeeId?: string } }>): void {
        const mArguments = oEvent.getParameters().arguments || {};
        this.employeeId = decodeURIComponent(mArguments.employeeId || "");
        this.loadEmployeeProfile();
    }

    private loadEmployeeProfile(): void {
        const oProfilesModel = new JSONModel();

        oProfilesModel.attachRequestCompleted(() => {
            const oView = this.getView();
            const oData = oProfilesModel.getData() as EmployeeProfilesData;
            const oEmployee = oData.employees.find((oCandidate) => oCandidate.employeeId === this.employeeId);

            if (!oEmployee || !oView) {
                this.showResourceMessage("profileDetailNotFoundMessage", this.employeeId);
                UIComponent.getRouterFor(this).navTo("RouteProfileOverview");
                return;
            }

            oView.setModel(new JSONModel({ ...oEmployee }), "employeeProfile");
        });

        oProfilesModel.attachRequestFailed(() => {
            this.showResourceMessage("profileDetailLoadFailedMessage", "");
            UIComponent.getRouterFor(this).navTo("RouteProfileOverview");
        });

        void oProfilesModel.loadData(sap.ui.require.toUrl("ganttchartdemo/model/employeeProfiles.json"));
    }

    private showResourceMessage(sKey: string, sValue: string): void {
        const oResourceModel = this.getOwnerComponent()?.getModel("i18n") as ResourceModel | undefined;
        const vResourceBundle = oResourceModel?.getResourceBundle();

        if (vResourceBundle instanceof Promise) {
            void vResourceBundle.then((oResourceBundle: ResourceBundle) => {
                MessageToast.show(oResourceBundle.getText(sKey, [sValue]) || "");
            });
            return;
        }

        MessageToast.show(vResourceBundle?.getText(sKey, [sValue]) || "");
    }
}
