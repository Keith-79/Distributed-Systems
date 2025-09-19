# stateful_agent_graph.py
# HW-2 — Stateful Agent Graph using langgraph (Supervisor Pattern)
# - Planner (LLM -> JSON tags+summary)
# - Reviewer (simulated issues for first 2 turns, then approve)
# - Supervisor (turn counter + loop governor)
# - Router with hard cap to avoid GraphRecursionError

from typing import TypedDict, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_ollama import ChatOllama
import json
import re
import time

# Tuning
MAX_TURNS = 10          # loop guard

# ========= Step 2: Shared State =========
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

# ========= Utilities =========
def extract_first_json_bracewise(s: str) -> dict:
    """Extract first complete top-level JSON object using a brace counter."""
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
    """Ensure exactly 3 lowercase tags; summary ≤ 25 words."""
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
    """LLM call + robust JSON parsing + normalization."""
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
    last_err = None
    for _ in range(retries + 1):
        try:
            result = llm.invoke(prompt).content.strip()
            proposal = extract_first_json_bracewise(result)
            return normalize_and_enforce(proposal)
        except Exception as e:
            last_err = e
            time.sleep(0.1)
    # Fallback keeps the graph alive
    return {"tags": ["general", "summary", "draft"], "summary": "Short summary not available yet."}

# ========= Step 3: Nodes =========
def planner_node(state: AgentState) -> Dict[str, Any]:
    print("--- NODE: Planner ---")
    llm = state["llm"]
    proposal = safe_plan(llm, state["title"], state["content"])
    return {"planner_proposal": proposal}

def reviewer_node(state: AgentState) -> Dict[str, Any]:
    print("--- NODE: Reviewer ---")
    turn = state.get("turn_count", 0)
    # Simulate issues for first two reviews to demonstrate correction loop
    if turn < 3:
        return {
            "reviewer_feedback": {
                "has_issue": True,
                "reason": f"Simulated issue at turn {turn} for correction loop testing."
            }
        }
    # After two corrections, approve
    return {"reviewer_feedback": {"has_issue": False, "reason": "No issues detected after revision."}}

# ========= Step 4: Supervisor (state + router) =========
def supervisor_node(state: AgentState) -> Dict[str, Any]:
    """Increment turn counter and guard infinite loops."""
    print("--- NODE: Supervisor ---")
    next_turn = state.get("turn_count", 0) + 1

    # If unresolved and we exceed cap, convert to approval to end cleanly
    if state.get("reviewer_feedback", {}).get("has_issue") and next_turn > MAX_TURNS:
        return {
            "turn_count": next_turn,
            "reviewer_feedback": {
                "has_issue": False,
                "reason": "Approved (stopped at MAX_TURNS; using latest draft).",
            }
        }

    return {"turn_count": next_turn}

def router_logic(state: AgentState) -> str:
    """Hard-cap routing + normal routing."""
    # HARD CAP: always exit by MAX_TURNS to prevent GraphRecursionError
    if state.get("turn_count", 0) >= MAX_TURNS:
        return END

    # No proposal yet → go to Planner
    if not state.get("planner_proposal"):
        return "planner"

    # If reviewer saw issues → loop back to Planner
    if state.get("reviewer_feedback", {}).get("has_issue"):
        return "planner"

    # Otherwise, we're done
    return END

# ========= Step 5 & 6: Assemble & Run =========
def run_agentic_graph():
    llm = ChatOllama(model="phi3:mini", temperature=0.2)

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
    graph.add_node("planner", planner_node)
    graph.add_node("reviewer", reviewer_node)
    graph.add_node("supervisor", supervisor_node)

    # Entry → Supervisor
    graph.set_entry_point("supervisor")

    # Supervisor routes based on state
    graph.add_conditional_edges("supervisor", router_logic, {"planner": "planner", END: END})

    # Planner → Reviewer
    graph.add_edge("planner", "reviewer")

    # Reviewer → Supervisor (increment turn, possibly cap/route)
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
        # Sanity checks before printing once
        assert len(final_proposal["tags"]) == 3, "Tags must have exactly 3 items"
        assert len(final_proposal["summary"].split()) <= 25, "Summary must be ≤ 25 words"

        print("\n=== FINAL ARTIFACT ===")
        print(json.dumps(final_proposal, indent=2))
    else:
        print("\n(No final artifact produced.)")

if __name__ == "__main__":
    run_agentic_graph()
