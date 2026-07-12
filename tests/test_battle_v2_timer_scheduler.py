from jjk_arena.battle_v2.timer_scheduler import PhaseTimerScheduler


def test_scheduler_ignores_stale_wakeup_after_deadline_is_rearmed():
    now = [0.0]
    deadlines = {"room": 5.0}
    tasks = []
    expired = []
    broadcasts = []

    def start_task(fn, *args):
        tasks.append((fn, args))

    def sleep(seconds):
        now[0] += seconds

    def expire(room_id):
        expired.append(room_id)
        deadlines[room_id] = None
        return True

    scheduler = PhaseTimerScheduler(
        get_deadline=lambda room_id: deadlines.get(room_id),
        expire=expire,
        on_expired=broadcasts.append,
        clock=lambda: now[0],
        start_task=start_task,
        sleep=sleep,
    )

    scheduler.arm("room")
    deadlines["room"] = 8.0
    scheduler.arm("room")
    stale_task, current_task = tasks

    stale_task[0](*stale_task[1])
    assert expired == []
    current_task[0](*current_task[1])

    assert expired == ["room"]
    assert broadcasts == ["room"]


def test_scheduler_deduplicates_same_deadline_and_cancel_invalidates_task():
    deadlines = {"room": 5.0}
    tasks = []
    expired = []
    now = [0.0]
    scheduler = PhaseTimerScheduler(
        get_deadline=lambda room_id: deadlines.get(room_id),
        expire=lambda room_id: expired.append(room_id) or True,
        on_expired=lambda room_id: None,
        clock=lambda: now[0],
        start_task=lambda fn, *args: tasks.append((fn, args)),
        sleep=lambda seconds: now.__setitem__(0, now[0] + seconds),
    )

    scheduler.arm("room")
    scheduler.arm("room")
    assert len(tasks) == 1
    scheduler.cancel("room")
    tasks[0][0](*tasks[0][1])

    assert expired == []
