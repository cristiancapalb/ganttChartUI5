import Opa5 from "sap/ui/test/Opa5";

const sViewName = "EmployeeGantt";

export default class ganttChartPage extends Opa5 {
	// Actions


	// Assertions
	iShouldSeeThePageView() {
		return this.waitFor({
			id: "employeeGanttPage",
			viewName: sViewName,
			success: function () {
				Opa5.assert.ok(true, "The " + sViewName + " view is displayed");
			},
			errorMessage: "Did not find the " + sViewName + " view"
		});
	}

}

