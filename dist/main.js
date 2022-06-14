"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
function run() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const inputs = {
                token: core.getInput("token"),
                branch: core.getInput("branch"),
                workflow: core.getInput("workflow"),
                verify: core.getInput('verify')
            };
            const octokit = github.getOctokit(inputs.token);
            const repository = process.env.GITHUB_REPOSITORY;
            const [owner, repo] = repository.split("/");
            core.info(`owner: ${owner}`);
            core.info(`repo: ${repo}`);
            core.info(`branch: ${inputs.branch}`);
            core.info(`workflow: ${inputs.workflow}`);
            core.info(`verify: ${inputs.verify}`);
            const workflows = yield octokit.actions.listRepoWorkflows({ owner, repo });
            core.info(`workflows: ${JSON.stringify(workflows)}`);
            const workflowId = (_a = workflows.data.workflows.find(w => w.name === inputs.workflow)) === null || _a === void 0 ? void 0 : _a.id;
            core.info(`workflowId: ${workflowId}`);
            if (!workflowId) {
                core.setFailed(`No workflow exists with the name "${inputs.workflow}"`);
                return;
            }
            else {
                core.info(`Discovered workflowId for search: ${workflowId}`);
            }
            const response = yield octokit.actions.listWorkflowRuns({ owner, repo, workflow_id: workflowId, per_page: 500 });
            core.info(`response: ${JSON.stringify(response)}`);
            const runs = response.data.workflow_runs
                .filter(x => (!inputs.branch || x.head_branch === inputs.branch) && x.conclusion === "success")
                .sort((r1, r2) => new Date(r2.created_at).getTime() - new Date(r1.created_at).getTime());
            core.info(`Found ${runs.length} successful runs`);
            let triggeringSha = process.env.GITHUB_SHA;
            let sha = undefined;
            if (runs.length > 0) {
                for (const run of runs) {
                    core.info(`This SHA: ${triggeringSha}`);
                    core.info(`Run SHA: ${run.head_sha}`);
                    core.info(`Run Branch: ${run.head_branch}`);
                    core.info(`Wanted branch: ${inputs.branch}`);
                    if (triggeringSha != run.head_sha && (!inputs.branch || run.head_branch === inputs.branch)) {
                        core.info(inputs.verify
                            ? `Commit ${run.head_sha} from run ${run.html_url} verified as last successful CI run.`
                            : `Using ${run.head_sha} from run ${run.html_url} as last successful CI run.`);
                        sha = run.head_sha;
                        break;
                    }
                }
            }
            else {
                core.info(`No previous runs found for branch ${inputs.branch}.`);
            }
            if (!sha) {
                core.warning("Unable to determine SHA of last successful commit. Using SHA for current commit.");
                sha = triggeringSha;
            }
            core.setOutput('sha', sha);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
