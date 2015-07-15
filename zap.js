var Zap = {
    header_event_key: 'Http-X-Wisembly-Event',
    application_base_url: 'https://solid.wisembly.com',

    action_item_catch_hook: function (bundle) {

        // works only for task events
        if (bundle.request.headers[this.header_event_key] &&
            !bundle.request.headers[this.header_event_key].match(/task./)) {
            return [];
        }

        var that = this,
            data = bundle.cleaned_request,
            task = data.task,
            current_meeting = null,
            users = _.object(_.pluck(data.users, 'id'), data.users),
            notes = _.object(_.pluck(data.notes, 'id'), data.notes),
            agendas = _.object(_.pluck(data.agendas, 'id'), data.agendas),
            meetings = _.object(_.pluck(data.meetings, 'id'), data.meetings),
            meeting_url = this.application_base_url + '/meetings/{hash}',
            assignees = _.map(task.assignees, function (id) { return that._getUser(users[id]); });

        // get current meeting through note->item->meeting --'
        current_meeting = meetings[agendas[notes[task.note].item].meeting];

        // see schemas/task.json
        return {
            action_item_name: task.title,
            created_at: task.created_at,
            due_for: null !== task.due_meeting ? meetings[task.due_meeting].expected_start : task.due_date,
            action_item_context: notes[task.note].title,
            sender: this._getUser(data.sender),
            assignees: assignees,
            assignees_names: _.pluck(assignees, 'name').join(', '),
            meeting_name: null !== current_meeting ? current_meeting.name: null,
            meeting_url: meeting_url.replace('{hash}', current_meeting.id),
            due_meeting_name: null !== task.due_meeting ? task.due_meeting.name : null,
            due_meeting_url: task.due_meeting ? meeting_url.replace('{hash}', meetings[task.due_meeting].id) : null
        };
    },

    meeting_started_catch_hook: function (bundle) {
        return this.meeting_stopped_catch_hook(bundle);
    },

    meeting_stopped_catch_hook: function (bundle) {

        // works only for meeting events
        if (bundle.request.headers[this.header_event_key] &&
            !bundle.request.headers[this.header_event_key].match(/meeting./)) {
            return [];
        }

        var that = this,
            data = bundle.cleaned_request,
            meeting = data.meeting,
            notes = _.object(_.pluck(data.notes, 'id'), data.notes),
            users = _.object(_.pluck(data.users, 'id'), data.users),
            participants = _.map(meeting.participants, function (id) { return that._getUser(users[id]); }),
            meeting_url = this.application_base_url + '/meetings/{hash}';

        var agenda = _.map(data.agendas, function (agenda) {
            agenda = _.pick(agenda, 'title', 'created_at', 'notes');
            agenda.notes = _.map(agenda.notes, function (id) {
                return _.pick(notes[id], 'title', 'created_at');
            });

            return agenda;
        });

        // create a html version of the agenda
        // @TODO: maybe change html markup, and certainly code it better :(
        var agenda_html = '<ul>';
        for (var i = 0; i < agenda.length; i++) {
            agenda_html += '<li><ul><li>' + agenda[i].title + '</li>';

            if (0 !== agenda[i].notes.length) {
                agenda_html += '<li><ul>';
                for (var j = 0; j < agenda[i].notes.length; j++) {
                    agenda_html += '<li>' + agenda[i].notes[j].title + '</li>';
                }
                agenda_html += '</ul></li>';
            }

            agenda_html += '</ul></li>';
        }
        agenda_html += '</ul>';

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
            agenda_html: agenda_html,
            meeting_url: meeting_url.replace('{hash}', meeting.id)
        };
    },

    _getUser: function (user) {
        try {
            return _.pick(user, 'name', 'email');
        } catch (error) {
            return {};
        }
    }
};

// small addition not to cc/paste into Zapier editor. only needed for tests
if (module) {
    module.exports = Zap;
}
