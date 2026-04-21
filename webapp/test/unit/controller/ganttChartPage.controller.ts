/*global QUnit*/
import Controller from "ganttchartdemo/controller/ganttChart.controller";

QUnit.module("ganttChart Controller");

QUnit.test("I should test the ganttChart controller", function (assert: Assert) {
	const oAppController = new Controller("ganttChart");
	oAppController.onInit();
	assert.ok(oAppController);
});