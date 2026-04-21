sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/gantt/misc/Format",
    "sap/gantt/config/TimeHorizon",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat",
    "sap/gantt/axistime/ProportionTimeLineOptions"
], function (Controller, JSONModel, GanttFormat, TimeHorizon, MessageToast, DateFormat, ProportionTimeLineOptions) {
    "use strict";

    return Controller.extend("ganttchartdemo.controller.EmployeeGantt", {
        onInit: function () {
            this._aEmployees = [];
            this._oDateFormat = DateFormat.getDateInstance({
                pattern: "MMM d, yyyy"
            });
            this._configureDateOnlyTimeline();

            var oModel = new JSONModel();
            oModel.attachRequestCompleted(this._onAllocationDataLoaded, this);
            oModel.attachRequestFailed(this._onAllocationDataFailed, this);
            oModel.loadData(sap.ui.require.toUrl("ganttchartdemo/model/employeeAllocations.json"));
            this.getView().setModel(oModel, "ganttModel");
        },

        _onAllocationDataLoaded: function (oEvent) {
            if (oEvent.getParameter("success") === false) {
                this._onAllocationDataFailed();
                return;
            }

            var oModel = this.getView().getModel("ganttModel");
            var aEmployees = oModel.getProperty("/employees") || [];

            this._prepareEmployees(aEmployees);
            this._aEmployees = this._clone(aEmployees);
            oModel.setProperty("/employees", aEmployees);
            this._expandEmployeeRows();
            this._setSelectedVisibleHorizon();
        },

        _onAllocationDataFailed: function () {
            MessageToast.show("Employee allocation data could not be loaded.");
        },

        formatAllocationStartDate: function (sDate) {
            return this._parseDateOnly(sDate);
        },

        formatAllocationEndDate: function (sDate) {
            var oEndDate = this._parseDateOnly(sDate);

            if (oEndDate) {
                oEndDate.setDate(oEndDate.getDate() + 1);
            }

            return oEndDate;
        },

        formatRowId: function (sEmployeeId, sAllocationId) {
            return sEmployeeId || sAllocationId || "";
        },

        isEmployeeRow: function (sAllocationId) {
            return !sAllocationId;
        },

        isAllocationRow: function (sAllocationId) {
            return !!sAllocationId;
        },

        formatEmployeeMeta: function (sEmployeeId, sRole) {
            return [sEmployeeId, sRole].filter(Boolean).join(" - ");
        },

        formatAllocationMeta: function (sAllocationId, sStatus) {
            return [sAllocationId, this._toTitleCase(sStatus)].filter(Boolean).join(" - ");
        },

        formatAllocationNumber: function (iPercentage) {
            return iPercentage || iPercentage === 0 ? String(iPercentage) : "";
        },

        formatAllocationUnit: function (iPercentage) {
            return iPercentage || iPercentage === 0 ? "%" : "";
        },

        formatAllocationValueState: function (bIsOverload) {
            return bIsOverload ? "Error" : "None";
        },

        formatStatusText: function (sStatus, sOverloadText) {
            if (sStatus) {
                return this._toTitleCase(sStatus);
            }

            return sOverloadText || "";
        },

        formatStatusState: function (sStatus, bOverloaded, bAllocationOverloaded) {
            if (bOverloaded || bAllocationOverloaded) {
                return "Error";
            }

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
        },

        formatAllocationTooltip: function (sProjectName, iPercentage, sStatus, sStartDate, sEndDate, bIncludeWeekends, bIsOverload) {
            var aLines = [
                sProjectName,
                "Allocation: " + iPercentage + "%",
                "Status: " + this._toTitleCase(sStatus),
                this._formatDateOnly(sStartDate) + " - " + this._formatDateOnly(sEndDate),
                "Includes weekends: " + (bIncludeWeekends ? "Yes" : "No")
            ];

            if (bIsOverload) {
                aLines.push("Capacity exceeds 100% during an overlap.");
            }

            return aLines.join("\n");
        },

        formatAllocationFill: function (sStatus, sProjectName) {
            var mStatusColors = {
                confirmed: "#2f9d5c",
                tentative: "#e9730c",
                planned: "#0a6ed1"
            };

            return mStatusColors[sStatus] || this._projectColor(sProjectName);
        },

        formatAllocationStroke: function (bIsOverload) {
            return bIsOverload ? "sapUiNegativeText" : "sapUiContentForegroundBorderColor";
        },

        formatAllocationStrokeWidth: function (bIsOverload) {
            return bIsOverload ? 2 : 1;
        },

        formatAllocationStrokeDasharray: function (bIsOverload) {
            return bIsOverload ? "5,2" : "";
        },

        onFilterAllocations: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            var aEmployees = this._filterEmployees(sQuery);
            var oModel = this.getView().getModel("ganttModel");

            oModel.setProperty("/employees", aEmployees);
            this._expandEmployeeRows();
        },

        onZoomPeriodChange: function (oEvent) {
            var sKey = oEvent.getSource().getSelectedKey();
            this._setVisibleHorizon(sKey);
        },

        onShapeSelectionChange: function (oEvent) {
            var aShapeIds = oEvent.getSource().getSelectedShapeId();

            if (!aShapeIds.length) {
                return;
            }

            var oAllocation = this._findAllocationById(aShapeIds[aShapeIds.length - 1]);

            if (oAllocation) {
                MessageToast.show(
                    oAllocation.employeeName + " - " +
                    oAllocation.projectName + " (" +
                    oAllocation.allocationPercentage + "%)"
                );
            }
        },

        _prepareEmployees: function (aEmployees) {
            aEmployees.forEach(function (oEmployee) {
                var aAllocations = oEmployee.allocations || [];

                aAllocations.forEach(function (oAllocation) {
                    oAllocation.isOverload = false;
                });

                var iPeakAllocation = this._markOverloadedAllocations(aAllocations);

                oEmployee.maxConcurrentAllocationPercentage = iPeakAllocation;
                oEmployee.overloaded = iPeakAllocation > 100;
                oEmployee.overloadText = oEmployee.overloaded ?
                    "Overloaded (" + iPeakAllocation + "%)" :
                    "Within capacity";
                oEmployee.allocationCount = aAllocations.length;
                oEmployee._shapeAllocations = [];

                aAllocations.forEach(function (oAllocation) {
                    oAllocation.employeeName = oEmployee.employeeName;
                    oAllocation.allocationFromDate = this._formatDateOnly(oAllocation.startDate);
                    oAllocation.allocationToDate = this._formatDateOnly(oAllocation.endDate);
                    oAllocation._shapeAllocations = [this._createShapeAllocation(oAllocation)];
                }, this);
            }, this);
        },

        _createShapeAllocation: function (oAllocation) {
            return {
                allocationId: oAllocation.allocationId,
                projectName: oAllocation.projectName,
                startDate: oAllocation.startDate,
                endDate: oAllocation.endDate,
                includeWeekends: oAllocation.includeWeekends,
                allocationFromDate: oAllocation.allocationFromDate,
                allocationToDate: oAllocation.allocationToDate,
                allocationPercentage: oAllocation.allocationPercentage,
                status: oAllocation.status,
                employeeName: oAllocation.employeeName,
                isOverload: oAllocation.isOverload
            };
        },

        _markOverloadedAllocations: function (aAllocations) {
            var aEvents = [];
            var aActiveAllocations = [];
            var iPeakAllocation = 0;

            aAllocations.forEach(function (oAllocation) {
                var oStartDate = this.formatAllocationStartDate(oAllocation.startDate);
                var oEndDate = this.formatAllocationEndDate(oAllocation.endDate);

                if (!oStartDate || !oEndDate) {
                    return;
                }

                aEvents.push({
                    time: oStartDate.getTime(),
                    type: "start",
                    allocation: oAllocation
                });
                aEvents.push({
                    time: oEndDate.getTime(),
                    type: "end",
                    allocation: oAllocation
                });
            }, this);

            aEvents.sort(function (oFirst, oSecond) {
                if (oFirst.time === oSecond.time) {
                    return oFirst.type === "end" ? -1 : 1;
                }

                return oFirst.time < oSecond.time ? -1 : 1;
            });

            for (var iIndex = 0; iIndex < aEvents.length;) {
                iPeakAllocation = Math.max(iPeakAllocation, this._markActiveWindow(aActiveAllocations));

                var sCurrentTime = aEvents[iIndex].time;
                var aCurrentEvents = [];

                while (iIndex < aEvents.length && aEvents[iIndex].time === sCurrentTime) {
                    aCurrentEvents.push(aEvents[iIndex]);
                    iIndex += 1;
                }

                aCurrentEvents.filter(function (oEvent) {
                    return oEvent.type === "end";
                }).forEach(function (oEvent) {
                    var iActiveIndex = aActiveAllocations.indexOf(oEvent.allocation);

                    if (iActiveIndex > -1) {
                        aActiveAllocations.splice(iActiveIndex, 1);
                    }
                });

                aCurrentEvents.filter(function (oEvent) {
                    return oEvent.type === "start";
                }).forEach(function (oEvent) {
                    aActiveAllocations.push(oEvent.allocation);
                });
            }

            return iPeakAllocation;
        },

        _markActiveWindow: function (aActiveAllocations) {
            var iWindowTotal = aActiveAllocations.reduce(function (iTotal, oAllocation) {
                return iTotal + Number(oAllocation.allocationPercentage || 0);
            }, 0);

            if (iWindowTotal > 100) {
                aActiveAllocations.forEach(function (oAllocation) {
                    oAllocation.isOverload = true;
                });
            }

            return iWindowTotal;
        },

        _filterEmployees: function (sQuery) {
            var sNormalizedQuery = String(sQuery || "").trim().toLowerCase();
            var aEmployees = this._clone(this._aEmployees);

            if (!sNormalizedQuery) {
                this._prepareEmployees(aEmployees);
                return aEmployees;
            }

            var aFilteredEmployees = aEmployees.reduce(function (aResult, oEmployee) {
                var bEmployeeMatch = this._matchesEmployee(oEmployee, sNormalizedQuery);

                if (!bEmployeeMatch) {
                    oEmployee.allocations = (oEmployee.allocations || []).filter(function (oAllocation) {
                        return this._matchesAllocation(oAllocation, sNormalizedQuery);
                    }, this);
                }

                if (bEmployeeMatch || oEmployee.allocations.length) {
                    aResult.push(oEmployee);
                }

                return aResult;
            }.bind(this), []);

            this._prepareEmployees(aFilteredEmployees);
            return aFilteredEmployees;
        },

        _matchesEmployee: function (oEmployee, sQuery) {
            return [
                oEmployee.employeeId,
                oEmployee.employeeName,
                oEmployee.role,
                oEmployee.department
            ].some(function (sValue) {
                return this._contains(sValue, sQuery);
            }, this);
        },

        _matchesAllocation: function (oAllocation, sQuery) {
            return [
                oAllocation.allocationId,
                oAllocation.projectName,
                oAllocation.status,
                String(oAllocation.allocationPercentage)
            ].some(function (sValue) {
                return this._contains(sValue, sQuery);
            }, this);
        },

        _contains: function (sValue, sQuery) {
            return String(sValue || "").toLowerCase().indexOf(sQuery) > -1;
        },

        _setVisibleHorizon: function (sPeriodKey) {
            var oZoomStrategy = this.byId("allocationZoom");
            var oStartDate = this._getEarliestAllocationDate();

            if (!oZoomStrategy || !oStartDate) {
                return;
            }

            var mPeriodDays = {
                day: 1,
                week: 7,
                month: 31
            };
            var iDays = mPeriodDays[sPeriodKey] || mPeriodDays.month;
            var oVisibleStart = new Date(oStartDate.getTime());
            var oVisibleEnd = new Date(oStartDate.getTime());

            oVisibleStart.setHours(0, 0, 0, 0);
            oVisibleEnd.setHours(0, 0, 0, 0);
            oVisibleEnd.setDate(oVisibleEnd.getDate() + iDays);

            oZoomStrategy.setVisibleHorizon(new TimeHorizon({
                startTime: this._toGanttBoundaryTimestamp(oVisibleStart),
                endTime: this._toGanttBoundaryTimestamp(oVisibleEnd)
            }));
        },

        _setSelectedVisibleHorizon: function () {
            var oZoomPeriod = this.byId("zoomPeriod");
            var sPeriodKey = oZoomPeriod ? oZoomPeriod.getSelectedKey() : "month";

            this._setVisibleHorizon(sPeriodKey);
        },

        _getEarliestAllocationDate: function () {
            var oModel = this.getView().getModel("ganttModel");
            var aEmployees = oModel.getProperty("/employees") || [];
            var aDates = [];

            aEmployees.forEach(function (oEmployee) {
                (oEmployee.allocations || []).forEach(function (oAllocation) {
                    if (oAllocation.startDate) {
                        aDates.push(this._parseDateOnly(oAllocation.startDate));
                    }
                }, this);
            }, this);

            if (!aDates.length) {
                return null;
            }

            return new Date(Math.min.apply(null, aDates.map(function (oDate) {
                return oDate.getTime();
            })));
        },

        _findAllocationById: function (sAllocationId) {
            var oFoundAllocation = null;

            this._aEmployees.some(function (oEmployee) {
                return (oEmployee.allocations || []).some(function (oAllocation) {
                    if (oAllocation.allocationId === sAllocationId) {
                        oFoundAllocation = Object.assign({
                            employeeName: oEmployee.employeeName
                        }, oAllocation);
                        return true;
                    }

                    return false;
                });
            });

            return oFoundAllocation;
        },

        _projectColor: function (sProjectName) {
            var aColors = [
                "sapUiAccent1",
                "sapUiAccent4",
                "sapUiAccent5",
                "sapUiAccent8",
                "sapUiAccent10"
            ];
            var iHash = String(sProjectName || "").split("").reduce(function (iValue, sCharacter) {
                return iValue + sCharacter.charCodeAt(0);
            }, 0);

            return aColors[iHash % aColors.length];
        },

        _formatDateOnly: function (sTimestamp) {
            var oDate = this._parseDateOnly(sTimestamp);

            return oDate ? this._oDateFormat.format(oDate) : "";
        },

        _parseDateOnly: function (sDate) {
            if (!sDate) {
                return null;
            }

            if (sDate.length === 8) {
                return new Date(
                    Number(sDate.slice(0, 4)),
                    Number(sDate.slice(4, 6)) - 1,
                    Number(sDate.slice(6, 8))
                );
            }

            return GanttFormat.abapTimestampToDate(sDate);
        },

        _configureDateOnlyTimeline: function () {
            var oZoomStrategy = this.byId("allocationZoom");
            var oDayOption = this._createWeekdayTimeLineOption();
            var oTimeLineOptions = Object.assign({}, ProportionTimeLineOptions, {
                "1day": oDayOption
            });

            if (oZoomStrategy && oDayOption) {
                oZoomStrategy.setTimeLineOptions(oTimeLineOptions);
                oZoomStrategy.setFinestTimeLineOption(oDayOption);
                oZoomStrategy.setTimeLineOption(oDayOption);
            }
        },

        _createWeekdayTimeLineOption: function () {
            var oBaseDayOption = ProportionTimeLineOptions["1day"];

            return {
                innerInterval: Object.assign({}, oBaseDayOption.innerInterval, {
                    range: 28
                }),
                largeInterval: Object.assign({}, oBaseDayOption.largeInterval, {
                    pattern: "MMMM yyyy"
                }),
                smallInterval: Object.assign({}, oBaseDayOption.smallInterval, {
                    pattern: "EEEEE d"
                })
            };
        },

        _toGanttBoundaryTimestamp: function (oDate) {
            return [
                oDate.getFullYear(),
                this._pad(oDate.getMonth() + 1),
                this._pad(oDate.getDate()),
                "000000"
            ].join("");
        },

        _pad: function (iValue) {
            return String(iValue).padStart(2, "0");
        },

        _toTitleCase: function (sValue) {
            return String(sValue || "").replace(/(^|[-_\s])\S/g, function (sMatch) {
                return sMatch.toUpperCase();
            });
        },

        _expandEmployeeRows: function () {
            var oTable = this.byId("employeeAllocationTable");

            if (oTable) {
                oTable.expandToLevel(1);
            }
        },

        _clone: function (vValue) {
            return JSON.parse(JSON.stringify(vValue));
        }
    });
});
