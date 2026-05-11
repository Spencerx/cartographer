# Cartographer Exa Research Refresh

Date: 2026-05-11
Status: external grounding refresh, not runner approval

This refresh uses Exa to check whether the Cartographer v2 PRD and eval plan still match the current direction of code-graph systems for coding agents.

## Sources Checked

- Codebase-Memory paper: https://arxiv.org/pdf/2603.27277
- CodeCompass / Navigation Paradox paper: https://arxiv.org/html/2602.20048v1
- CodeScaleBench technical report: https://github.com/sourcegraph/CodeScaleBench/blob/main/docs/technical_reports/TECHNICAL_REPORT.md
- Code Rosetta MCP: https://github.com/spuny/code-rosetta-mcp
- Code Atlas: https://github.com/SerPeter/code-atlas
- CodeTracer paper: https://arxiv.org/abs/2604.11641
- Theory of Code Space paper: https://arxiv.org/abs/2603.00601v4
- AgenticCodebase: https://github.com/agentralabs/codebase
- Memtrace: https://github.com/syncable-dev/memtrace-public
- Codemap: https://github.com/AyoubAchour/codemap
- Codemesh: https://github.com/pyalwin/codemesh
- Tree-sitter basic parsing docs: https://tree-sitter.github.io/tree-sitter/using-parsers/2-basic-parsing.html
- Sourcegraph precise code navigation docs: https://docs.sourcegraph.com/docs/code-navigation/precise-code-navigation
- SCIP protocol repo: https://github.com/sourcegraph/scip
- Synapps LSP code graph: https://github.com/SynappsCodeComprehension/synapps
- Context Master semantic-vs-heuristic code graph article: https://www.context-master.dev/blog/deterministic-semantic-code-graphs
- Repository map pattern: https://agentpatterns.ai/context-engineering/repository-map-pattern/
- RANGER repository-level graph retrieval: https://arxiv.org/abs/2509.25257
- RepoGraph: https://openreview.net/forum?id=dw9VUsSHGB
- CodeGraph for Claude Code: https://github.com/colbymchenry/codegraph
- graphify-ts: https://github.com/Howell5/graphify-ts

## Findings

1. Persistent graph memory is now an explicit agent-navigation pattern.
   - Codebase-Memory builds a Tree-sitter-backed persistent graph in SQLite, exposes graph queries over MCP, and reports competitive answer quality with fewer tokens and fewer tool calls than file exploration.
   - Cartographer should keep its local, durable graph snapshot and compact preflight command. The graph should be queried before broad source exploration, but source reads remain necessary for final edit confidence.

2. Tree-sitter is necessary but still not enough.
   - Codebase-Memory augments Tree-sitter with language-specific resolution and separate edge confidence.
   - Code Rosetta combines Tree-sitter with HCL, YAML, and Jinja parsing to model cross-language IaC/config edges.
   - Cartographer should keep provenance labels for syntax, compiler-backed, package/task, IaC/data, agent-inferred, and human-reviewed facts instead of collapsing all edges into one confidence bucket.

3. Agent adoption is a first-class eval target.
   - CodeCompass found that graph quality alone did not matter when the agent skipped the graph tool. The paper reports much better architectural coverage when the graph tool was actually used, and weak results when it was ignored.
   - Cartographer's `graphPreflight` hook and strict `cartographer adoption --require-graph-first` gate are the right direction because they measure and can eventually enforce graph-first behavior instead of relying only on prompt text.

4. Evals need both navigation quality and trajectory evidence.
   - CodeScaleBench separates task outcomes from retrieval metrics and keeps traces, timing, cost, and verifier outputs.
   - Cartographer eval reports should keep raw trajectories, first graph command latency, source reads before graph, first correct file, top-k gold-file recall, precision, validation-command recall, and hallucinated paths.

5. Monorepo and IaC graphs need edge weighting.
   - Code Rosetta explicitly avoids traversing structural `CONTAINS` edges for blast-radius fan-out and reserves traversal for dependency edges such as imports, references, remote state, config reads, and template rendering.
   - Cartographer impact scoring should distinguish containment from dependency edges so slices do not pass by returning entire directories.

6. Hybrid retrieval is the practical shape.
   - Code Atlas combines graph traversal, BM25, and semantic search behind MCP tools.
   - Cartographer should not be graph-only. The graph should orient the agent, then direct file reads, search, and optional semantic overlay checks should fill the source-level gaps.

7. Trajectory-level evals are becoming the stronger evidence standard.
   - CodeTracer argues that end-state success alone hides where a coding-agent run first goes wrong. It standardizes heterogeneous run artifacts into hierarchical traces, annotates stages and steps, and scores failure-onset localization against step-level labels.
   - Cartographer's eval runner should keep the existing adoption classifier, but the report should also preserve enough stage-level evidence to explain whether the graph helped the agent move from exploration to correct action. A graph-first run that gathers the right files but still edits the wrong module should fail an understanding metric, not only pass an adoption metric.

8. Architectural belief durability should be measured explicitly.
   - Theory of Code Space evaluates whether agents maintain coherent architectural beliefs under partial observability and repeated probes.
   - Cartographer should score durable understanding as a time-series property where possible: first correct file, retained package/module hypothesis, dependency-closure updates after new evidence, and regression when the agent forgets an earlier graph fact.

9. Repo-local memory systems converge on trust metadata and stale-anchor handling.
   - Codemap separates curated graph memory from rebuildable source indexes, groups returned memory by trust/staleness, and treats writeback suggestions as prompts rather than automatic truth.
   - Codemesh separates a structural Tree-sitter layer from an agent-written semantic layer and invalidates semantic writebacks when referenced files change.
   - Cartographer's accepted/stale annotation model is aligned with this pattern. The eval suite should include stale-evidence cases and require agents to inspect source anchors before relying on low-trust semantic notes.

10. Multi-repo and temporal graph memory are emerging requirements, not edge cases.
    - AgenticCodebase advertises multi-context workspaces and cross-repo migration queries.
    - Memtrace emphasizes temporal evolution, API topology, change detection, and impact scoring over time.
    - Cartographer v2 should keep monorepo/IaC as the first scale target, but the PRD should leave room for multi-repo graph manifests, cross-service API topology, and temporal edges from git history.

11. Hook-based graph-first workflows need measurement, not blind trust.
    - Codemesh documents a skill plus pre/post-read hooks that push graph context before reads and ask agents to write back after reads.
    - Cartographer's `TurnInput.graphPreflight` hook is the same class of intervention. The eval should measure whether the hook changes behavior: source reads before graph use, first graph command latency, first relevant file latency, final validation execution, and writeback quality.

12. Public benchmark claims should be treated as directional unless reproducible locally.
    - Several tools publish speed, cost, and quality claims, but their repos, models, hardware, judges, prompts, and task sets vary.
    - Cartographer reports should avoid borrowing external numeric claims. They can cite external systems for design pressure, but speed and understanding targets must come from local ARK/Axia smoke and baseline reports with environment metadata.

13. The best current product shape is a quality ladder, not a single graph.
    - Tree-sitter's official docs describe a concrete syntax tree with node positions, named nodes, and incremental parsing. That is strong for fast structural extraction and dirty worktrees, but it is not a semantic resolver.
    - Sourcegraph precise code navigation uses SCIP for language-agnostic definitions, references, and implementations, and recommends CI indexing for complex builds because reliable semantic context depends on the repo's real build configuration.
    - Cartographer should keep Tree-sitter-style extraction as the broad fallback, then promote specific edges to compiler-backed only when TypeScript, SCIP, or LSP evidence exists.

14. Semantic graph availability is itself a workflow signal.
    - Context Master frames the tradeoff cleanly: heuristic parser graphs are fast and tolerate broken code, while LSP/SCIP-style semantic graphs provide higher-fidelity relationships but require more setup and healthier project state.
    - Cartographer preflight should report when precision graph inputs are unavailable, stale, or skipped, instead of silently downgrading to parser confidence.

15. Agent annotations should capture non-derivable working knowledge, not duplicate graph facts.
    - Synapps exposes graph queries for architecture, scoped context, impact, tests, HTTP endpoints, and typed relationships, while reserving summaries for design rationale, constraints, ownership, and deprecation plans.
    - Cartographer's overlay should follow the same anti-corruption rule: do not ask agents to restate imports or symbol definitions; ask them to record edit warnings, validation recipes, ownership rules, and cross-system meaning that cites graph/source evidence.

16. Scoped context tools are more useful than raw graph dumps.
    - Synapps' `get_context_for` scopes such as structure, method, edit, and impact map closely to Cartographer's preflight/context split.
    - Cartographer should keep `preflight` compact for default agent orientation and reserve full `context --json` for scoring, review, and deeper analysis.

17. Repository-map ranking is valuable but freshness-sensitive.
    - The repository map pattern uses Tree-sitter extraction plus graph ranking to fit relevant symbols into a token budget.
    - The same pattern can mislead on rapidly changing repositories or heavy metaprogramming, which supports Cartographer's dirty-worktree manifest, live preflight, stale annotation markers, and precision gates against directory dumping.

18. Agent-facing code graph tools are converging on "graph first, source second."
    - CodeGraph and graphify-ts both present the same workflow pressure: pre-index symbols and relationships, expose compact graph/context queries to agents, then let agents read only the files the graph surfaces.
    - Cartographer should keep `preflight` compact and should avoid turning the main session into a raw graph dump. If deeper source context is needed, it belongs in a bounded explore/review step with explicit paths.

19. Repository-level graph retrieval now combines symbolic and natural-language routes.
    - RANGER builds a repository graph and uses direct graph lookup for entity queries, while natural-language queries use graph exploration plus semantic scoring.
    - Cartographer should keep deterministic graph selectors as the first path and add hybrid fallback intentionally: graph orientation first, then source search or semantic retrieval when the graph has a known gap.

20. RepoGraph reinforces that repository-level structure is a reusable agent module, not just a summary artifact.
    - RepoGraph reports gains when plugged into multiple software-engineering agents, which supports ARK exposing graph primitives that Codex, Cartographer, and later clients can consume independently.
    - Cartographer v2 should keep the graph as the source of navigation truth and treat `docs/CODEBASE_MAP.md` as a view.

21. Agent-provided labels need anti-corruption rules.
    - graphify-ts exposes optional semantic labels that the agent can provide, while CodeGraph includes richer context tools. Both patterns are useful, but neither should let model-written labels overwrite parser/compiler facts.
    - Cartographer's overlay should therefore remain candidate-first, evidence-linked, reviewable, and stale-markable. The first eval runner should prove deterministic graph recall before any semantic overlay scoring is enabled.

## PRD Implications

- Keep `cartographer preflight` as the default first agent command.
- Keep the Codex harness condition split: `baseline-direct`, `graph-prompted`, and `graph-mandated`.
- Add edge-weighted impact scoring to the eval target list so containment-only expansion is penalized.
- Add hybrid fallback expectations: graph first, then direct source reads and search when the graph is incomplete.
- Treat live Codex adoption rate as a real metric, not a demo.
- Preserve stage-level trace fields in live-agent reports so graph adoption can be distinguished from correct evidence-to-action conversion.
- Add belief-durability probes to the later baseline profile: ask the agent related follow-up questions after new evidence and score whether earlier package/module hypotheses remain coherent.
- Keep semantic overlay writebacks reviewable by default: suggestions can be emitted automatically, but accepted graph memory still needs source anchors, hash freshness, and human or policy approval.
- Keep external benchmark numbers out of success criteria unless the same benchmark can be run locally with pinned model, host, prompt, and report metadata.
- Treat graph quality as a ladder: filesystem and syntax facts are broad and fast; compiler-backed facts are precise but conditional; package/task/IaC facts need domain parsers; agent overlays record only non-derivable workflow meaning.
- Add eval checks for precision-provider availability, fallback reasons, and annotation anti-duplication so agents do not mistake parser-level facts for compiler truth or semantic notes for facts.
- Rename ambiguous "semantic-edge availability" wording to precision-edge or provider-availability checks. Keep "semantic overlay" for Codex/OpenRouter/human-authored guidance.
- Require deterministic navigation scoring with overlays disabled or ignored before reporting overlay-assisted usefulness.
- Treat CodeGraph/graphify-style benchmark numbers as directional product evidence only; local Cartographer claims still require ARK/Axia reports from the approved runner.

## Gate Status

This research update does not approve runner scaffolding. The `$evals` gate still blocks:

- `scripts/cartographer-code-graph-evals.ts`
- `eval:cartographer:*` package scripts
- fixture snapshots or structured task records
- generated Cartographer eval reports
- judge prompts or calibration files
