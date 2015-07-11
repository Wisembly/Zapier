var Zap = {
    action_item_catch_hook: function(bundle) {
        var i,
            data = bundle.cleaned_request,
            task = data.task,
            users = {},
            notes = {},
            meetings = {},
            assignees = [],
            meeting_url = 'https://solid.wisembly.com/meetings/{hash}';

        // transform user array to user mapped object
        for (i = 0; i < data.users.length; i++) {
            users[data.users[i].id] = _.pick(data.users[i], 'id', 'name', 'email');
        }

        // same for meetings
        for (i = 0; i < data.meetings.length; i++) {
            meetings[data.meetings[i].id] = data.meetings[i];
        }

        // same for notes
        for (i = 0; i < data.notes.length; i++) {
            notes[data.notes[i].id] = data.notes[i];
        }

        // handle assigneess array
        for (i = 0; i < task.assignees.length; i++) {
            assignees.push(users[task.assignees[i]]);
        }

        // see schemas/task.json
        return {
            action_item_name: task.title,
            created_at: task.created_at,
            due_for: null !== task.due_meeting ? meetings[task.due_meeting].expected_start : task.due_date,
            action_item_context: notes[task.note].title,
            sender: _.pick(data.sender, 'id', 'name', 'email'),
            assignees: assignees,
            assignees_names: _.pluck(assignees, 'name').join(', '),
            meeting_url: meeting_url.replace('{hash}', meetings[task.meeting].id),
            due_meeting_url: task.due_meeting ? meeting_url.replace('{hash}', meetings[task.due_meeting].id) : null
        };
    }
};
