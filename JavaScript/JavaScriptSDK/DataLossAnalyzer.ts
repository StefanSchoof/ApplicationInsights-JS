﻿module Microsoft.ApplicationInsights {
    "use strict";

    export class DataLossAnalyzer {
        static enabled = false;
        static appInsights: Microsoft.ApplicationInsights.AppInsights;
        static issuesReportedForThisSession;
        static LIMIT_PER_SESSION = 10;
        static ITEMS_QUEUED_KEY = "AI_itemsQueued";
        static ISSUES_REPORTED_KEY = "AI_lossIssuesReported";

        static reset() {
            if (DataLossAnalyzer.isEnabled()) {
                Util.setSessionStorage(DataLossAnalyzer.ITEMS_QUEUED_KEY, "0");
            }
        }

        private static isEnabled(): boolean {
            return DataLossAnalyzer.enabled &&
                DataLossAnalyzer.appInsights != null &&
                Util.canUseSessionStorage()
        }

        static getIssuesReported(): number {
            var result =
                (!DataLossAnalyzer.isEnabled() || isNaN(+Util.getSessionStorage(DataLossAnalyzer.ISSUES_REPORTED_KEY))) ?
                    0 :
                    +Util.getSessionStorage(DataLossAnalyzer.ISSUES_REPORTED_KEY);

            return result;
        }

        static incrementItemsQueued() {
            try {
                if (DataLossAnalyzer.isEnabled()) {
                    var itemsQueued: number = DataLossAnalyzer.getNumberOfLostItems();
                    ++itemsQueued;
                    Util.setSessionStorage(DataLossAnalyzer.ITEMS_QUEUED_KEY, itemsQueued.toString());
                }
            } catch (e) { }
        }

        static decrementItemsQueued(countOfItemsSentSuccessfully: number) {
            try {
                if (DataLossAnalyzer.isEnabled()) {
                    var itemsQueued: number = DataLossAnalyzer.getNumberOfLostItems();
                    itemsQueued -= countOfItemsSentSuccessfully;
                    if (itemsQueued < 0) itemsQueued = 0;
                    Util.setSessionStorage(DataLossAnalyzer.ITEMS_QUEUED_KEY, itemsQueued.toString());
                }
            } catch (e) { }
        }

        static getNumberOfLostItems(): number {
            var result: number = 0;
            try {
                if (DataLossAnalyzer.isEnabled()) {
                    result = isNaN(+Util.getSessionStorage(DataLossAnalyzer.ITEMS_QUEUED_KEY)) ?
                        0 :
                        +Util.getSessionStorage(DataLossAnalyzer.ITEMS_QUEUED_KEY);
                }
            } catch (e) {
                result = 0;
            }

            return result;
        }

        static reportLostItems() {
            try {
                if (DataLossAnalyzer.isEnabled() &&
                    DataLossAnalyzer.getIssuesReported() < DataLossAnalyzer.LIMIT_PER_SESSION &&
                    DataLossAnalyzer.getNumberOfLostItems() > 0) {

                    DataLossAnalyzer.appInsights.trackTrace(
                        "AI (Internal): Internal report DATALOSS:\"" + DataLossAnalyzer.getNumberOfLostItems() + "\"",
                        null);
                    DataLossAnalyzer.appInsights.flush();

                    var issuesReported: number = DataLossAnalyzer.getIssuesReported();
                    ++issuesReported;
                    Util.setSessionStorage(DataLossAnalyzer.ISSUES_REPORTED_KEY, issuesReported.toString());
                }
            } catch (e) {
                _InternalLogging.throwInternalNonUserActionable(LoggingSeverity.CRITICAL,
                    new _InternalLogMessage(_InternalMessageId.NONUSRACT_FailedToReportDataLoss, "Failed to report data loss: " + Util.getExceptionName(e), { exception: Util.dump(e) }));
            }
            finally {
                try {
                    DataLossAnalyzer.reset();
                } catch (e) { }
            }
        }
    }
}
