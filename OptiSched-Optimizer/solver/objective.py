from dataclasses import dataclass

from highspy import Highs

from .variables import AuxiliaryVariables, Variables

from mapper import SolverData

def build_objective(model: Highs, variables: Variables, auxiliary: AuxiliaryVariables, data: SolverData) -> None:

    weights = data.objective_weights

    # ======================================================
    # S1 - Timetable Holes
    #
    # α ( Σl - Σf - Σz )
    #
    # Constant terms are omitted.
    # ======================================================

    for column in auxiliary.l.values():
        model.changeColCost(column, weights.alpha)

    for column in auxiliary.f.values():
        model.changeColCost(column, -weights.alpha)

    for column in auxiliary.z.values():
        model.changeColCost(column, -weights.alpha)

    # ======================================================
    # S2 - Distribution Along the Week
    #
    # β Σv
    # ======================================================

    for column in auxiliary.v.values():
        model.changeColCost(column, weights.beta)

    # ======================================================
    # S3 - Same-Offering Block Preference
    #
    # -γ Σb
    #
    # Negative on purpose: b_ot = 1 when SubjectOffering o has two of its
    # own lectures back-to-back at t and next(t). Rewarding (not
    # penalizing) this keeps a subject's repeated sessions on the same day
    # grouped into a block instead of interleaved with other offerings —
    # which is what actually happens when S2 (same-day concentration)
    # can't avoid a same-day repeat. gamma=0 (the default) makes this term
    # a no-op, so "prefer blocking the same subject together" is opt-in
    # via the admin's weight slider.
    # ======================================================

    for column in auxiliary.b.values():
        model.changeColCost(column, -weights.gamma)

    # ======================================================
    # S4 - Classroom Stability
    #
    # δ Σu
    #
    # The constant (-|O|) is omitted.
    # ======================================================

    for column in auxiliary.u.values():
        model.changeColCost(column, weights.delta)

    # ======================================================
    # S5 - Preferred Time-of-Day
    #
    # ε Σ x_port  for every (p,o,r,t) where t is NOT in the
    #             admin-chosen preferred time-of-day range
    #
    # No auxiliary variable needed: penalizing x directly whenever its
    # TimeSlot falls outside the preferred window is enough to nudge the
    # solver toward using preferred slots first. An empty preferred set
    # (no shift chosen) makes this a no-op.
    # ======================================================

    if data.preferred_time_slots:
        for (p, o, r, t), x_column in variables.x.items():
            if t not in data.preferred_time_slots:
                model.changeColCost(x_column, weights.epsilon)