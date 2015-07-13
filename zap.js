var Zap = {
    header_event_key: 'Http-X-Wisembly-Event',

    action_item_catch_hook: function (bundle) {

        // works only for task events
        if (bundle.request.headers[this.header_event_key]
            && !bundle.request.headers[this.header_event_key].match(/task./)) {
            return [];
        }

        var that = this,
            data = bundle.cleaned_request,
            task = data.task,
            users = _.object(_.pluck(data.users, 'id'), data.users),
            notes = _.object(_.pluck(data.notes, 'id'), data.notes),
            agendas = _.object(_.pluck(data.agendas, 'id'), data.agendas),
            meetings = _.object(_.pluck(data.meetings, 'id'), data.meetings),
            meeting_url = 'https://solid.wisembly.com/meetings/{hash}',
            assignees = _.map(task.assignees, function (id) { return that._getUser(users[id]); });

        // get current meeting through note->item->meeting --'
        var current_meeting = meetings[agendas[notes[task.note].item].meeting];

        // see schemas/task.json
        return {
            action_item_name: task.title,
            created_at: task.created_at,
            due_for: null !== task.due_meeting ? meetings[task.due_meeting].expected_start : task.due_date,
            action_item_context: notes[task.note].title,
            sender: this._getUser(data.sender),
            assignees: assignees,
            assignees_names: _.pluck(assignees, 'name').join(', '),
            meeting_url: meeting_url.replace('{hash}', current_meeting.id),
            due_meeting_url: task.due_meeting ? meeting_url.replace('{hash}', meetings[task.due_meeting].id) : null
        };
    },

    meeting_catch_hook: function (bundle) {

        // works only for meeting events
        if (bundle.request.headers[this.header_event_key]
            && !bundle.request.headers[this.header_event_key].match(/meeting./)) {
            return [];
        }

        var that = this,
            data = bundle.cleaned_request,
            meeting = data.meeting,
            participants = [],
            notes = _.object(_.pluck(data.notes, 'id'), data.notes),
            users = _.object(_.pluck(data.users, 'id'), data.users),
            participants = _.map(meeting.participants, function (id) { return that._getUser(users[id]); }),
            meeting_url = 'https://solid.wisembly.com/meetings/{hash}';

        var agenda = _.map(data.agendas, function (agenda) {
            agenda = _.pick(agenda, 'title', 'created_at', 'notes');
            agenda.notes = _.map(agenda.notes, function (id) {
                return _.pick(notes[id], 'title', 'created_at');
            });

            return agenda;
        });

        // see schemas/meeting.json
        return {
            name: meeting.name,
            description: meeting.description,
            expected_start: meeting.expected_start,
            expected_end: meeting.expected_end,
            real_start: meeting.real_start,
            real_end: meeting.real_end,
            preparation: meeting.preparation,
            is_recurring: meeting.is_recurring,
            owner: this._getUser(users[meeting.owner]),
            sender: this._getUser(data.sender),
            participants: participants,
            agenda: agenda,
            meeting_url: meeting_url.replace('{hash}', meeting.id)
        };
    },

    _getUser: function (user) {
        return _.pick(user, 'name', 'email');
    }
};

// small addition not to cc/paste into Zapier editor. only needed for tests
if (module) {
    module.exports = Zap;
}
