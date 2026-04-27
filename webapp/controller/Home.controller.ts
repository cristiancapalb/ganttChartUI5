import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";

/**
 * @namespace ganttchartdemo.controller
 */
export default class Home extends Controller {
    public onOpenGanttApp(): void {
        UIComponent.getRouterFor(this).navTo("RouteEmployeeGantt");
    }

    public onOpenProfileOverview(): void {
        UIComponent.getRouterFor(this).navTo("RouteProfileOverview");
    }

    public onOpenProjectConfiguration(): void {
        UIComponent.getRouterFor(this).navTo("RouteProjectConfiguration");
    }
}
