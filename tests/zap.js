var Zap = require('../zap.js'),
    moment = require('moment'),
    expects = require('expect.js'),
    underscore = _ = require('underscore');

// verify that an object implement at least all 1rst level shema properties
var verifySchema = function (schema, object) {
    for (var method in schema) {
        if (!_.has(object, method)) {
            return { error: 'Method "%s" is not implemented by object'.replace('%s', method) };
        }
    }

    return true;
};

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

    describe('Action Items', function () {
        var data = require('../hooks/task.json');

        it('should have a valid schema', function () {
            var result = Zap.action_item_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(verifySchema(require('../schemas/task.json'), result)).to.be(true);
        });

        it('should only work for task hooks', function () {
            var request = { headers: [] };

            request.headers[Zap.header_event_key] = "foo";
            expects(Zap.action_item_catch_hook({ cleaned_request: {}, request: request }).length).to.be(0);
            request.headers[Zap.header_event_key] = "task.create";
            expects(Zap.action_item_catch_hook({ cleaned_request: data, request: request })).to.be.an('object');
            request.headers[Zap.header_event_key] = "task.edit";
            expects(Zap.action_item_catch_hook({ cleaned_request: data, request: request })).to.be.an('object');
        });

        it('should transform hook sent data into something usable in Zapier', function () {
            var result = Zap.action_item_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result).to.be.an('object');
            expects(result.action_item_name).to.be('A delightful task to do');
            expects(result.created_at).to.be('2015-07-10T16:53:03+00:00');
            expects(result.due_for).to.be('2015-07-13T17:00:00+00:00');
            expects(result.action_item_context).to.be('Grosse grosse note');
            expects(result.sender.name).to.be('Guillaume Potier');
            expects(result.assignees_names).to.be('Guillaume Potier, Romain David, Andreï Vestemeanu');
            expects(result.meeting_url).to.be('https://solid.wisembly.com/meetings/Fe29206');
            expects(result.due_meeting_url).to.be('https://solid.wisembly.com/meetings/y4821f2');
            expects(result.assignees[0]).to.eql({ name: "Guillaume Potier", email: "guillaume@wisembly.com" });
        });

        it('should handle due_for', function () {
            var result = Zap.action_item_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result.due_for).to.be('2015-07-13T17:00:00+00:00');
            data.task.due_date = '2020-07-13T17:00:00+00:00'
            data.task.due_meeting = null;
            result = Zap.action_item_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result.due_for).to.be(data.task.due_date);
        });

        it('should transform users', function () {
            var result = Zap.action_item_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(result.sender).to.eql({ name: "Guillaume Potier", email: "guillaume@wisembly.com" })
        });
    });

    describe('Meetings', function () {
        var data = require('../hooks/meeting.json');

        it('should have a valid schema', function () {
            var result = Zap.meeting_catch_hook({ cleaned_request: data, request: { headers: [] } });
            expects(verifySchema(require('../schemas/meeting.json'), result)).to.be(true);
        });

        it('should only work for meeting hooks', function () {
            var request = { headers: [] };

            request.headers[Zap.header_event_key] = "task.create";
            expects(Zap.meeting_catch_hook({ cleaned_request: {}, request: request }).length).to.be(0);
            request.headers[Zap.header_event_key] = "meeting.start";
            expects(Zap.meeting_catch_hook({ cleaned_request: data, request: request })).to.be.an('object');
            request.headers[Zap.header_event_key] = "meeting.stop";
            expects(Zap.meeting_catch_hook({ cleaned_request: data, request: request })).to.be.an('object');
        });

        it('should handle agenda object', function () {
            var result = Zap.meeting_catch_hook({ cleaned_request: data, request: { headers: [] } });

            expects(result.agenda.length).to.be(4);
            expects(result.agenda[0].title).to.be('Set the goal of the meeting');
            expects(result.agenda[0].created_at).to.be('2015-07-10T09:29:12+00:00');
            expects(result.agenda[0].notes.length).to.be(6);
            expects(result.agenda[0].notes[0].title).to.be('The goal of this demonstration meeting has been set by Solid earlier. It describes what needs to happen as a result of the meeting.');
            expects(result.agenda[0].notes[0].created_at).to.be('2015-07-10T09:29:12+00:00');
        });
    });
});
