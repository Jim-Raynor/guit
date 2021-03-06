import root from './root';
import Suite from './spec/suite';
import Spec from './spec/spec';
import {
    startedLog,
    suiteStartedLog,
    specStartedLog,
    specDoneLog,
    suiteDoneLog,
    doneLog
} from './report';

const reErrorType = /Expectation\.(\w+)\s/;

async function beforeSuite(suite) {
    suiteStartedLog(suite);
    for (let i = 0; i < suite.beforeAllList.length; i++) {
        await suite.beforeAllList[i].call(suite.context);
    }
}

async function afterSuite(suite) {
    for (let i = 0; i < suite.afterAllList.length; i++) {
        await suite.afterAllList[i].call(suite.context);
    }
    suiteDoneLog(suite);
}

async function runSuite(suite) {
    suite.context = suite.parent ? suite.parent.context : {};
    Object.assign(suite.context, root.helpers);
    await beforeSuite(suite);
    await eachItems(suite.items);
    await afterSuite(suite);
}

async function beforeSpec(spec) {
    specStartedLog(spec);
    for (let i = 0; i < spec.suite.path.length; i++) {
        let suite = spec.suite.path[i];
        for (let j = 0; j < suite.beforeEachList.length; j++) {
            await suite.beforeEachList[j].call(spec.suite.context);
        }
    }
}

async function afterSpec(spec) {
    for (let i = spec.suite.path.length - 1; i >= 0; i--) {
        let suite = spec.suite.path[i];
        for (let j = 0; j < suite.afterEachList.length; j++) {
            await suite.afterEachList[j].call(spec.suite.context);
        }
    }
    specDoneLog(spec);
}

async function runSpec(spec) {
    root.currentSpec = spec;
    await beforeSpec(spec);
    try {
        await spec.fn.call(spec.suite.context);
    } catch(error) {
        error.type = (error.stack.match(reErrorType) || [])[1];
        if (!error.type) throw error;
        root.currentSpec.error = error;
    }
    await afterSpec(spec);
    if (spec.error) root.isFailed = true;
}

async function eachItems(items, isUI) {
    for (let i = 0; i < items.length; i++) {
        if (items[i] instanceof Suite) {
            if (isUI && !items[i].source) continue;
            await runSuite(items[i]);
        }
        if (items[i] instanceof Spec) {
            await runSpec(items[i]);
        }
    }
}

export async function runSpecs(isUI) {
    startedLog();
    await eachItems(root.items, isUI);
    doneLog();
    if (root.isFailed && !isUI) {
        process.exit(1);
    }
}
