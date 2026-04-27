import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import BaseEvent from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ListBinding from "sap/ui/model/ListBinding";
import Table from "sap/m/Table";
import ColumnListItem from "sap/m/ColumnListItem";

/**
 * @namespace ganttchartdemo.controller
 */
export default class ProfileOverview extends Controller {
    public onInit(): void {
        const oProfilesModel = new JSONModel();
        const oView = this.getView();

        void oProfilesModel.loadData(sap.ui.require.toUrl("ganttchartdemo/model/employeeProfiles.json"));
        oView?.setModel(oProfilesModel, "profiles");
    }

    public onNavBack(): void {
        UIComponent.getRouterFor(this).navTo("RouteHome");
    }

    public onOpenEmployeeProfile(oEvent: BaseEvent<Record<string, never>, ColumnListItem>): void {
        const oSource = oEvent.getSource();
        const oContext = oSource.getBindingContext("profiles");
        const sEmployeeId = oContext?.getProperty("employeeId") as string | undefined;

        if (!sEmployeeId) {
            return;
        }

        UIComponent.getRouterFor(this).navTo("RouteProfileDetail", {
            employeeId: encodeURIComponent(sEmployeeId)
        });
    }

    public onFilterEmployees(oEvent: BaseEvent<{ query?: string; newValue?: string }>): void {
        const mParameters = oEvent.getParameters();
        const sQuery = mParameters.query || mParameters.newValue || "";
        const oTable = this.byId("employeeOverviewTable") as Table;
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
                    new Filter("employeeName", FilterOperator.Contains, sQuery),
                    new Filter("department", FilterOperator.Contains, sQuery),
                    new Filter("role", FilterOperator.Contains, sQuery),
                    new Filter("location", FilterOperator.Contains, sQuery)
                ],
                and: false
            })
        ]);
    }
}
