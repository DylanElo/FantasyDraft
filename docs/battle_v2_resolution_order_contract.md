# Battle v2 canonical resolution order

The authoritative resolver executes a confirmed player queue in this order:

1. Validate exact queue identity, caster ownership, replacement slot, targets, conditions, and aggregate energy without mutation.
2. Spend confirmed queue energy.
3. Resolve actions left-to-right.
4. Resolve the effective skill from its declared base slot and revalidate targets; an invalidated action fizzles.
5. Trigger selected-target watchers and controlled redirects.
6. Commit the action: mark the caster acted, set cooldown, and emit the private/public skill-resolution event.
7. Evaluate counter once for the complete skill. A counter consumes itself and prevents every skill effect; paid energy and cooldown remain committed.
8. Evaluate reflect once per selected recipient before effects. Harmful target effects redirect; documented self-effects remain on the caster.
9. Freeze original, primary, secondary, resolved-target, and pre-effect status context.
10. Execute effects in declared order and target scope.
11. Execute retaliation and melee/post-skill punishments.
12. Consume explicitly scoped one-shot and exact-skill modifiers after the complete skill.
13. Finish the acting turn: delayed effects, status clocks, cooldown clocks, cleanup, energy gain, and next-player transition.
14. Check and emit victory after authoritative effects and cleanup.

This contract does not decide the open fixed-damage-reduction aggregation or
universal anti-domain policy.
