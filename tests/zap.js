var Zap = require('../zap.js'),
    moment = require('moment'),
    expects = require('expect.js'),
    underscore = require('underscore');

global.moment = moment;
global._ = underscore;

describe('Test Zap code', function () {
    describe('Misc', function () {
        it('should be an object', function () {
            expects(Zap).to.be.an('object');
        });

        it('should have a getUser method', function () {
            expects(Zap._getUser({
                foo: "bar",
                id: "Us3rTYh",
                name: "Name",
                email: "email@host.ext",
                other: "other"
            })).to.eql({ name: "Name", email: "email@host.ext" });
        });
    });

    describe('Subscribe hooks', function () {
        it('should have a pre_subscribe method', function () {
            var response = Zap.pre_subscribe({ subscription_url: 'endpoint', event: 'task.assign', request: {} });
            expects(response.method).to.be('POST');
            expects(JSON.parse(response.data).webhook.content_type).to.be('application/json');
            expects(JSON.parse(response.data).webhook.endpoint).to.be('endpoint');
            expects(JSON.parse(response.data).webhook.actions[0]).to.be('task.assign');
        });

        it('should have a post_subscribe method', function () {
            var response = Zap.post_subscribe({ response: { content: JSON.stringify({ webhook: { id: 42 } }) } });
            expects(response.webhook_id).to.be(42);
        });

        it('should have a pre_unsubscribe method', function () {
            var response = Zap.pre_unsubscribe({ request: {} });
            expects(response.method).to.be('DELETE');
            expects(response.data).to.be(null);
        });

    });

    describe('Action Items', function () {
        var data = require('../hooks/task.json');

        it('should have a valid schema', function () {
            var result = Zap.new_action_item_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(verifySchema(require('../schema/task.json'), result)).to.be(true);
        });

        it('should have a valid tasks schema', function () {
            var schema = require('../schema/task.json');
            var tasks = require('../schema/tasks.json');

            expects(verifySchema(schema, tasks[0])).to.be(true);
            expects(verifySchema(schema, tasks[1])).to.be(true);
        });

        it('should only work for task hooks', function () {
            var request = { headers: [] };

            request.headers[Zap.header_event_key] = "foo";
            expects(Zap.new_action_item_catch_hook({ cleaned_request: {}, request: request }).length).to.be(0);
            request.headers[Zap.header_event_key] = "task.create";
            expects(Zap.new_action_item_catch_hook({ cleaned_request: data, request: request })).to.be.an('object');
            request.headers[Zap.header_event_key] = "task.edit";
            expects(Zap.new_action_item_catch_hook({ cleaned_request: data, request: request })).to.be.an('object');
        });

        it('should transform hook sent data into something usable in Zapier', function () {
            var result = Zap.new_action_item_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result).to.be.an('object');
            expects(result.action_item_name).to.be('A delightful task to do');
            expects(result.created_at).to.be('2015-07-10T16:53:03+00:00');
            expects(result.due_on).to.be('2015-07-13T17:00:00+00:00');
            expects(result.sender.name).to.be('Guillaume Potier');
            expects(result.assignees_names).to.be('Guillaume Potier, Romain David, Andreï Vestemeanu');
            expects(result.meeting_url).to.be('https://solid.wisembly.com/meetings/Fe29206');
            expects(result.due_meeting_url).to.be('https://solid.wisembly.com/meetings/y4821f2');
            expects(result.due_meeting_name).to.be('Happy Monday');
        });

        it('should handle due_on', function () {
            var result = Zap.new_action_item_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result.due_on).to.be('2015-07-13T17:00:00+00:00');
            data.note.due_date = '2020-07-13T17:00:00+00:00'
            data.note.due_meeting = null;
            result = Zap.new_action_item_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result.due_on).to.be('2020-07-13');
        });

        it('should transform users', function () {
            var result = Zap.new_action_item_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result.sender).to.eql({ name: "Guillaume Potier", email: "guillaume@wisembly.com" });
        });

        it('should handle assignees_names and assignees_emails', function () {
            var result = Zap.new_action_item_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result.assignees_names).to.eql('Guillaume Potier, Romain David, Andreï Vestemeanu');
            expects(result.assignees_emails).to.eql('guillaume@wisembly.com, romain@wisembly.com, andrei@wisembly.com');
        });

        it('should have a shared created and assign meeting hook', function () {
            var result1 = Zap.new_action_item_catch_hook({ cleaned_request: data, request: { headers: [] } });
            var result2 = Zap.new_action_item_assigned_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result1).to.eql(result2);
        });
    });

    describe('Meetings', function () {
        var data = require('../hooks/meeting.json');
        var expected_output = require('../schema/meeting.json');

        it('should have a valid schema', function () {
            var result = Zap.meeting_stopped_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(verifySchema(require('../schema/meeting.json'), result)).to.be(true);
        });

        it('should have a valid meetings schema', function () {
            var schema = require('../schema/meeting.json');
            var meetings = require('../schema/meetings.json');

            expects(verifySchema(schema, meetings[0])).to.be(true);
        });

        it('should only work for meeting hooks', function () {
            var request = { headers: [] };

            request.headers[Zap.header_event_key] = "task.create";
            expects(Zap.meeting_stopped_catch_hook({ cleaned_request: {}, request: request }).length).to.be(0);
            request.headers[Zap.header_event_key] = "meeting.start";
            expects(Zap.meeting_stopped_catch_hook({ cleaned_request: data, request: request })).to.be.an('object');
            request.headers[Zap.header_event_key] = "meeting.stop";
            expects(Zap.meeting_stopped_catch_hook({ cleaned_request: data, request: request })).to.be.an('object');
        });

        it('should handle agenda_markdown version', function () {
            var result = Zap.meeting_stopped_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result.agenda_markdown.trim()).to.be(expected_output.agenda_markdown.trim());
        });

        it('should handle agenda_plaintext version', function () {
            var result = Zap.meeting_stopped_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result.agenda_plaintext.trim()).to.be(expected_output.agenda_plaintext.trim());
        });

        it('should handle agenda_html version', function () {
            var result = Zap.meeting_stopped_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result.agenda_html.trim()).to.be(expected_output.agenda_html.trim());
        });

        it('should have a shared started and stoped meeting hook', function () {
            var result1 = Zap.meeting_stopped_catch_hook({ cleaned_request: data, request: { headers: [] } });
            var result2 = Zap.meeting_started_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result1).to.eql(result2);
        });

        it('should handle attendees_names and attendees_emails', function () {
            var result = Zap.meeting_stopped_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result.attendees_names).to.eql('Guillaume Potier, Meeting Fixture');
            expects(result.attendees_emails).to.eql('guillaume@wisembly.com, meeting+fixture@wisembly.com');
        });
    });
});

// verify that an object implement at least all 1rst level shema properties
var verifySchema = function (schema, object) {
    for (var method in schema) {
        if (!_.has(object, method)) {
            return { error: 'Method "%s" is not implemented by object'.replace('%s', method) };
        }
    }

    return true;
};
