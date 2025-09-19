from typing import TypedDict, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_ollama import ChatOllama
import json, re, time

class AgentState(TypedDict):
    title: str
    content: str
    email: str
    strict: bool
    task: str
    llm: Any
    planner_proposal: Dict[str, Any]
    reviewer_feedback: Dict[str, Any]
    turn_count: int

# ===== Utilities =====
def extract_first_json_bracewise(s: str) -> dict:
    start = s.find("{")
    if start == -1:
        raise ValueError("No '{' found in model output.")
    depth = 0
    for i in range(start, len(s)):
        c = s[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                frag = s[start:i+1]
                return json.loads(frag)
    raise ValueError("Unbalanced braces; no complete JSON object found.")

def normalize_and_enforce(proposal: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(proposal, dict):
        raise ValueError("Proposal must be a dict.")
    tags = proposal.get("tags", [])
    summary = proposal.get("summary", "")

    if not isinstance(tags, list):
        tags = []
    tags = [str(t).strip().lower() for t in tags if str(t).strip()]
    if len(tags) < 3:
        tags = (tags + ["general"])[:3]
    elif len(tags) > 3:
        tags = tags[:3]

    words = re.findall(r"\w+(?:[-’']\w+)?", str(summary))
    summary = " ".join(words[:25])
    return {"tags": tags, "summary": summary}

def safe_plan(llm, title: str, content: str, retries: int = 1) -> Dict[str, Any]:
    prompt = (
        "You are a planning assistant.\n"
        f"Title: {title}\n"
        f"Content: {content}\n\n"
        "Return ONLY a JSON object on a single line with EXACTLY these keys:\n"
        '{"tags": ["...", "...", "..."], "summary": "..."}\n'
        "- tags: 3 topical, lowercase tokens\n"
        "- summary: under 25 words\n"
        "No extra text—JSON only."
    )
    for _ in range(retries + 1):
        try:
            result = llm.invoke(prompt).content.strip()
            proposal = extract_first_json_bracewise(result)
            return normalize_and_enforce(proposal)
        except Exception:
            time.sleep(0.05)
    return {"tags": ["general", "summary", "draft"], "summary": "Short summary not available yet."}


def make_planner_node():
    def planner_node(state: AgentState) -> Dict[str, Any]:
        print("--- NODE: Planner ---")
        llm = state["llm"]
        proposal = safe_plan(llm, state["title"], state["content"])
        return {"planner_proposal": proposal}
    return planner_node

def make_reviewer_node(mode: str):
    def reviewer_node(state: AgentState) -> Dict[str, Any]:
        print("--- NODE: Reviewer ---")
        turn = state.get("turn_count", 0)
        if mode == "fail":
            return {"reviewer_feedback": {"has_issue": True, "reason": "Forced issue (guard demo)."}}
        if turn < 3:
            return {"reviewer_feedback": {"has_issue": True, "reason": f"Simulated issue at turn {turn} for correction loop testing."}}
        return {"reviewer_feedback": {"has_issue": False, "reason": "No issues detected after revision."}}
    return reviewer_node

def make_supervisor_node(MAX_TURNS: int):
    def supervisor_node(state: AgentState) -> Dict[str, Any]:
        print("--- NODE: Supervisor ---")
        next_turn = state.get("turn_count", 0) + 1
        if state.get("reviewer_feedback", {}).get("has_issue") and next_turn > MAX_TURNS:
            return {
                "turn_count": next_turn,
                "reviewer_feedback": {
                    "has_issue": False,
                    "reason": "Approved (stopped at MAX_TURNS; using latest draft).",
                }
            }
        return {"turn_count": next_turn}
    return supervisor_node

def make_router(MAX_TURNS: int):
    def router_logic(state: AgentState) -> str:
        if state.get("turn_count", 0) >= MAX_TURNS:
            return END
        if not state.get("planner_proposal"):
            return "planner"
        if state.get("reviewer_feedback", {}).get("has_issue"):
            return "planner"
        return END
    return router_logic

# ===== Scenario runner =====
def run_scenario(title: str, mode: str, MAX_TURNS: int, llm_temp: float = 0.0):
    print("\n" + "="*72)
    print(f"{title}  |  mode={mode}  MAX_TURNS={MAX_TURNS}  temperature={llm_temp}")
    print("="*72)

    llm = ChatOllama(model="phi3:mini", temperature=llm_temp)

    initial_state: AgentState = {
        "title": "Vector Clocks and Conflict Resolution",
        "content": "Explains vector clocks, partial ordering, and how conflicts are detected and resolved across replicas.",
        "email": "",
        "strict": True,
        "task": "generate-tags-and-summary",
        "llm": llm,
        "planner_proposal": {},
        "reviewer_feedback": {},
        "turn_count": 0,
    }

    graph = StateGraph(AgentState)
    graph.add_node("planner", make_planner_node())
    graph.add_node("reviewer", make_reviewer_node(mode))
    graph.add_node("supervisor", make_supervisor_node(MAX_TURNS))

    graph.set_entry_point("supervisor")
    graph.add_conditional_edges("supervisor", make_router(MAX_TURNS), {"planner": "planner", END: END})
    graph.add_edge("planner", "reviewer")
    graph.add_edge("reviewer", "supervisor")

    chain = graph.compile()

    final_proposal = None
    for step in chain.stream(initial_state, config={"recursion_limit": 100}):
        print("\n--- Step Result ---")
        print(step)
        for _, node_out in step.items():
            if isinstance(node_out, dict) and "planner_proposal" in node_out:
                final_proposal = node_out["planner_proposal"]

    if final_proposal:
        # sanity checks (single print per scenario)
        assert len(final_proposal["tags"]) == 3, "Tags must have exactly 3 items"
        assert len(final_proposal["summary"].split()) <= 25, "Summary must be ≤ 25 words"
        print("\n=== FINAL ARTIFACT ===")
        print(json.dumps(final_proposal, indent=2))
    else:
        print("\n(No final artifact produced.)")

def run_agentic_graph():
    run_scenario("Scenario A — Guard demo (forced issues)", mode="fail", MAX_TURNS=3, llm_temp=0.0)
    run_scenario("Scenario B — Approval flow (issues then approve)", mode="auto", MAX_TURNS=10, llm_temp=0.0)

if __name__ == "__main__":
    run_agentic_graph()
