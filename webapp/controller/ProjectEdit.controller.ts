import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import BaseEvent from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import type ResourceBundle from "sap/base/i18n/ResourceBundle";

interface Project {
    id: string;
    name: string;
    owner: string;
    status: string;
    startDate: string;
    endDate: string;
    timelineScale: string;
    capacityThreshold: number;
    includeWeekends: boolean;
}

interface ProjectsData {
    projects: Project[];
}

/**
 * @namespace ganttchartdemo.controller
 */
export default class ProjectEdit extends Controller {
    private projectId = "";

    public onInit(): void {
        UIComponent.getRouterFor(this).getRoute("RouteProjectEdit")?.attachPatternMatched(this.onRouteMatched.bind(this), this);
    }

    public onNavBack(): void {
        UIComponent.getRouterFor(this).navTo("RouteProjectConfiguration");
    }

    public onSave(): void {
        const oProjectModel = this.getView()?.getModel("project") as JSONModel | undefined;
        const oProject = oProjectModel?.getData() as Project | undefined;

        this.showResourceMessage("projectEditSaveMessage", oProject?.name || "");
        UIComponent.getRouterFor(this).navTo("RouteProjectConfiguration");
    }

    private onRouteMatched(oEvent: BaseEvent<{ arguments?: { projectId?: string } }>): void {
        const mArguments = oEvent.getParameters().arguments || {};
        this.projectId = decodeURIComponent(mArguments.projectId || "");
        this.loadProject();
    }

    private loadProject(): void {
        const oProjectsModel = new JSONModel();

        oProjectsModel.attachRequestCompleted(() => {
            const oView = this.getView();
            const oData = oProjectsModel.getData() as ProjectsData;
            const oProject = oData.projects.find((oCandidate) => oCandidate.id === this.projectId);

            if (!oProject || !oView) {
                this.showResourceMessage("projectEditNotFoundMessage", this.projectId);
                UIComponent.getRouterFor(this).navTo("RouteProjectConfiguration");
                return;
            }

            oView.setModel(new JSONModel({ ...oProject }), "project");
        });

        oProjectsModel.attachRequestFailed(() => {
            this.showResourceMessage("projectEditLoadFailedMessage", "");
            UIComponent.getRouterFor(this).navTo("RouteProjectConfiguration");
        });

        void oProjectsModel.loadData(sap.ui.require.toUrl("ganttchartdemo/model/projects.json"));
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
