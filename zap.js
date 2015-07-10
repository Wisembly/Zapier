var Zap = {
    action_item_catch_hook: function(bundle) {
        var i,
            data = bundle.cleaned_request,
            task = data.task,
            users = {},
            notes = {},
            assignees = [];

        // find due meeting if there is one
        var due_meeting = null;
        if (null !== task.due_meeting) {
            for (i = 0; i < data.meetings.length; i++) {
                if (data.meetings[i].id === task.due_meeting) {
                    due_meeting = data.meetings[i];
                    break;
                }
            }
        }

        // transform user array to user mapped object
        for (i = 0; i < data.users.length; i++) {
            users[data.users[i].id] = {
                id: data.users[i].id,
                name: data.users[i].name,
                email: data.users[i].email
            };
        }

        // same for notes
        for (i = 0; i < data.notes.length; i++) {
            notes[data.notes[i].id] = data.notes[i];
        }

        // handle assigneess array
        for (i = 0; i < task.assignees.length; i++) {
            assignees.push(users[task.assignees[i]]);
        }

        // see shemas/task.json
        return {
            action_item_name: task.title,
            created_at: task.created_at,
            due_for: null !== due_meeting ? due_meeting.expected_start : task.due_date,
            action_item_context: notes[task.note].title,
            sender: {
                id: data.sender.id,
                name: data.sender.name,
                email: data.sender.email
            },
            assignees: assignees,
            assignees_names: _.pluck(assignees, 'name').join(', ')
        };
    }
};
