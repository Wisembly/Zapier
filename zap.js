var Zap = {
    action_item_catch_hook: function(bundle) {
        var data = bundle.cleaned_request,
            headers = bundle.headers,
            assignees = [],
            task = data.task,
            users = _.object(_.pluck(data.users, 'id'), data.users),
            notes = _.object(_.pluck(data.notes, 'id'), data.notes),
            agendas = _.object(_.pluck(data.agendas, 'id'), data.agendas),
            meetings = _.object(_.pluck(data.meetings, 'id'), data.meetings),
            meeting_url = 'https://solid.wisembly.com/meetings/{hash}';

        // work only for task events
        if (headers['x-wisembly-event'] && !headers['x-wisembly-event'].match(/task./)) {
            return [];
        }

        // handle assigneess array
        for (var i = 0; i < task.assignees.length; i++) {
            assignees.push(users[task.assignees[i]]);
        }

        // get current meeting through note->item->meeting --'
        var current_meeting = meetings[agendas[notes[task.note].item].meeting];

        // see schemas/task.json
        return {
            action_item_name: task.title,
            created_at: task.created_at,
            due_for: null !== task.due_meeting ? meetings[task.due_meeting].expected_start : task.due_date,
            action_item_context: notes[task.note].title,
            sender: _.pick(data.sender, 'id', 'name', 'email'),
            assignees: assignees,
            assignees_names: _.pluck(assignees, 'name').join(', '),
            meeting_url: meeting_url.replace('{hash}', current_meeting.id),
            due_meeting_url: task.due_meeting ? meeting_url.replace('{hash}', meetings[task.due_meeting].id) : null
        };
    }
};

// small addition not to cc/paste into Zapier editor. only needed for tests
module.exports = Zap;
