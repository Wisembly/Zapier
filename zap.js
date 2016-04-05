'use strict';

var Zap = {
    header_event_key: 'Http-X-Wisembly-Event',
    application_base_url: 'https://solid.wisembly.com',

    /*********************************
    * Auth & subscribe Hooks
    *********************************/

    pre_subscribe: function (bundle) {
        bundle.request.method = 'POST';
        bundle.request.data = JSON.stringify({
            webhook: {
                content_type: 'application/json',
                endpoint: bundle.subscription_url,
                actions: [bundle.event]
            }
        });

        return bundle.request;
    },

    post_subscribe: function (bundle) {
        // must return a json serializable object for use in pre_unsubscribe
        var data = JSON.parse(bundle.response.content);

        // we need this in order to build the {{webhook_id}}
        // in the rest hook unsubscribe url
        return { webhook_id: data.webhook.id };
    },

    pre_unsubscribe: function (bundle) {
        bundle.request.method = 'DELETE';
        bundle.request.data = null;

        return bundle.request;
    },

    /*********************************
    * Task Hooks
    *********************************/

    new_action_item_assigned_catch_hook: function (bundle) {
        return this.new_action_item_catch_hook(bundle);
    },

    new_action_item_catch_hook: function (bundle) {

        // works only for task events
        if (bundle.request.headers[this.header_event_key] &&
            !bundle.request.headers[this.header_event_key].match(/task./)) {
            return [];
        }

        var that = this,
            data = bundle.cleaned_request,
            task = data.note,
            name = task.title.replace(/<(?:.|\n)*?>/gm, ''), // remove potential simple html tags
            current_meeting = null,
            users = _.object(_.pluck(data.users, 'id'), data.users),
            meetings = _.object(_.pluck(data.meetings, 'id'), data.meetings),
            meeting_url = this.application_base_url + '/meetings/{hash}',
            assignees = _.map(task.assignees, function (id) { return that._getUser(users[id]); });

        // get current meeting through note->item->meeting --'
        current_meeting = meetings[task.meeting];

        // see schemas/task.json
        return {
            action_item_name: name,
            created_at: task.created_at,
            due_on: null !== task.due_meeting ? meetings[task.due_meeting].expected_start : moment(task.due_date).format('YYYY-MM-DD'),
            sender: this._getUser(data.sender),
            assignees_names: _.pluck(assignees, 'name').join(', '),
            assignees_emails: _.pluck(assignees, 'email').join(', '),
            meeting_name: null !== current_meeting ? current_meeting.name: null,
            meeting_url: meeting_url.replace('{hash}', current_meeting.id),
            due_meeting_name: null !== task.due_meeting ? meetings[task.due_meeting].name : null,
            due_meeting_url: null !== task.due_meeting ? meeting_url.replace('{hash}', meetings[task.due_meeting].id) : null
        };
    },

    /*********************************
    * Meeting Hooks
    *********************************/

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
            notes = data.notes,
            users = _.object(_.pluck(data.users, 'id'), data.users),
            participants = _.object(_.pluck(data.participants, 'id'), data.participants),
            attendees = _.map(meeting.participants, function (id) { return that._getUser(users[participants[id].user]); }),
            meeting_url = this.application_base_url + '/meetings/{hash}';

        // create a html & markdown version of the agenda
        // @TODO: maybe change html markup, and certainly code it better :(
        var agenda_html = '';
        var agenda_markdown = '';
        var agenda_plaintext = '';

        for (var i = 0; i < notes.length; i++) {
            switch (notes[i].type) {
                case "item":
                    agenda_html += '<h1>' + notes[i].title + '</h1>';
                    agenda_markdown += '## ' + notes[i].title + "\n";
                    agenda_plaintext += notes[i].title + "\n";
                    break;
                case "section":
                    agenda_html += '<hr />';
                    agenda_markdown += "---\n";
                    agenda_plaintext += "---\n";
                    break;
                case "action":
                    agenda_html += '<p>' + notes[i].title + '</p>';
                    agenda_markdown += '  - ' + notes[i].title + "\n";
                    agenda_plaintext += '  - ' + notes[i].title + "\n";
                    break;
                default:
                    agenda_html += '<p>' + notes[i].title + '</p>';
                    agenda_markdown += '  - ' + notes[i].title + "\n";
                    agenda_plaintext += '  - ' + notes[i].title + "\n";
                    break;
            }
        }

        // see schemas/meeting.json
        return {
            name: meeting.name,
            goal: meeting.description,
            expected_start: meeting.expected_start,
            expected_end: meeting.expected_end,
            real_start: meeting.real_start,
            real_end: meeting.real_end,
            preparation: meeting.preparation,
            is_recurring: meeting.is_recurring,
            owner: this._getUser(users[meeting.owner]),
            sender: this._getUser(data.sender),
            attendees_names: _.pluck(attendees, 'name').join(', '),
            attendees_emails: _.pluck(attendees, 'email').join(', '),
            agenda_html: agenda_html,
            agenda_markdown: agenda_markdown,
            agenda_plaintext: agenda_plaintext,
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
