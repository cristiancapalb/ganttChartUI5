import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import BaseEvent from "sap/ui/base/Event";
import Button from "sap/m/Button";
import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ListBinding from "sap/ui/model/ListBinding";
import Table from "sap/m/Table";

/**
 * @namespace ganttchartdemo.controller
 */
export default class ProjectConfiguration extends Controller {
    public onInit(): void {
        const oProjectsModel = new JSONModel();
        const oView = this.getView();

        void oProjectsModel.loadData(sap.ui.require.toUrl("ganttchartdemo/model/projects.json"));
        oView?.setModel(oProjectsModel, "projects");
    }

    public onNavBack(): void {
        UIComponent.getRouterFor(this).navTo("RouteHome");
    }

    public onEditProject(oEvent: BaseEvent<Record<string, never>, Button>): void {
        const oSource = oEvent.getSource();
        const oContext = oSource.getBindingContext("projects");
        const sProjectId = oContext?.getProperty("id") as string | undefined;

        if (!sProjectId) {
            return;
        }

        UIComponent.getRouterFor(this).navTo("RouteProjectEdit", {
            projectId: encodeURIComponent(sProjectId)
        });
    }

    public onFilterProjects(oEvent: BaseEvent<{ query?: string; newValue?: string }>): void {
        const mParameters = oEvent.getParameters();
        const sQuery = mParameters.query || mParameters.newValue || "";
        const oTable = this.byId("projectOverviewTable") as Table;
        const oBinding = oTable?.getBinding("items") as ListBinding | undefined;

        if (!oBinding) {
            return;
        }

        if (!sQuery) {
            oBinding.filter([]);
            return;
        }

        oBinding.filter([
            new Filter({
                filters: [
                    new Filter("name", FilterOperator.Contains, sQuery),
                    new Filter("owner", FilterOperator.Contains, sQuery),
                    new Filter("status", FilterOperator.Contains, sQuery)
                ],
                and: false
            })
        ]);
    }

    public formatDateRange(sStartDate?: string, sEndDate?: string): string {
        return [sStartDate, sEndDate].filter(Boolean).join(" - ");
    }

    public formatStatusText(sStatus?: string): string {
        if (!sStatus) {
            return "";
        }

        return sStatus.charAt(0).toUpperCase() + sStatus.slice(1);
    }

    public formatStatusState(sStatus?: string): string {
        switch (sStatus) {
            case "confirmed":
                return "Success";
            case "tentative":
                return "Warning";
            case "planned":
                return "Information";
            default:
                return "None";
        }
    }
}
