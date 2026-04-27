import Opa5 from "sap/ui/test/Opa5";

const sViewName = "Home";

export default class HomePage extends Opa5 {
	// Assertions
	iShouldSeeThePageView() {
		return this.waitFor({
			id: "homePage",
			viewName: sViewName,
			success: function () {
				Opa5.assert.ok(true, "The " + sViewName + " view is displayed");
			},
			errorMessage: "Did not find the " + sViewName + " view"
		});
	}
}
