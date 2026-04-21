/* global window, parent, location */

interface JsUnitTestSuite {
	addTestPage(sUrl: string): void;
}

interface JsUnitParent extends Window {
	jsUnitTestSuite: new () => JsUnitTestSuite;
}

interface TestSuiteWindow extends Window {
	suite: () => JsUnitTestSuite;
}

((window as unknown) as TestSuiteWindow).suite = function() {
	var SuiteConstructor = (parent as unknown as JsUnitParent).jsUnitTestSuite,
		oSuite = new SuiteConstructor(),
		sContextPath = location.pathname.substring(0, location.pathname.lastIndexOf("/") + 1);

	oSuite.addTestPage(sContextPath + "unit/unitTests.qunit.html");
	oSuite.addTestPage(sContextPath + "integration/opaTests.qunit.html");

	return oSuite;
};
