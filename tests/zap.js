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
    it('should be an object', function () {
        expects(Zap).to.be.an('object');
    });

    describe('Action Items', function () {
        var data = {"task":{"id":"O277c59","title":"Et cette t\u00e2chinette ?","created_at":"2015-07-10T16:54:59+00:00","class_name":"Task","due_date":null,"note":"tcbd4af","due_meeting":"y4821f2","assignees":["q7c05f1","ef90235"]},"notes":[{"id":"tcbd4af","title":"Grosse grosse note","type":"default","created_at":"2015-07-10T16:50:39+00:00","class_name":"Note","position":3,"item":"Ebfb610"}],"agendas":[{"id":"Ebfb610","title":"Set the goal of the meeting","created_at":"2015-07-10T09:29:12+00:00","class_name":"Item","position":0,"meeting":"Fe29206"}],"meetings":[{"id":"Fe29206","persisted":true,"name":"A demonstration meeting with Solid","description":"The purpose of this meeting is to show you how to run a productive and actionable meeting, with a little help from Solid.","provider":"wisembly","expected_start":"2015-07-10T09:24:12+00:00","expected_end":"2015-07-10T09:54:12+00:00","real_start":"2015-07-10T09:24:12+00:00","real_end":null,"preparation":"good","roti":{"worthless":{"count":0,"percent":0},"negative":{"count":0,"percent":0},"ok":{"count":0,"percent":0},"good":{"count":0,"percent":0},"perfect":{"count":0,"percent":0},"total":0},"blocked":false,"is_fixture":true,"is_recurring":false,"class_name":"Meeting"},{"id":"y4821f2","persisted":true,"name":"Happy Monday","description":"Point hebdo\n\nView meeting on Solid : https:\/\/solid.wisembly.com\/meetings\/we16f70","provider":"google","expected_start":"2015-07-13T17:00:00+00:00","expected_end":"2015-07-13T19:00:00+00:00","real_start":null,"real_end":null,"preparation":"bad","roti":{"worthless":{"count":0,"percent":0},"negative":{"count":0,"percent":0},"ok":{"count":0,"percent":0},"good":{"count":0,"percent":0},"perfect":{"count":0,"percent":0},"total":0},"blocked":false,"is_fixture":false,"is_recurring":true,"class_name":"Meeting"}],"users":[{"id":"q7c05f1","name":"Romain David","email":"romain@wisembly.com","company":null,"root":true,"avatar":null,"timezone_offset":60,"subscriptions":{"digests":{"meetings":true}}},{"id":"ef90235","name":"Andre\u00ef Vestemeanu","email":"andrei@wisembly.com","company":null,"root":true,"avatar":null,"timezone_offset":60,"subscriptions":{"digests":{"meetings":true}}}],"sender":{"id":"A807971","name":"Guillaume Potier","email":"guillaume@wisembly.com","company":null,"root":true,"avatar":null,"timezone_offset":120,"subscriptions":{"digests":{"meetings":true}}}};

        it('should have a valid schema', function () {
            var result = Zap.action_item_catch_hook({ cleaned_request: data, headers: {} });
            expects(verifySchema(require('../schemas/task.json'), result)).to.be(true);
        });

        it('should only work for task hooks', function () {
            var result = Zap.action_item_catch_hook({ cleaned_request: {}, headers: { "x-wisembly-event": "foo" } });
            expects(result.length).to.be(0);

            var result = Zap.action_item_catch_hook({ cleaned_request: data, headers: { "x-wisembly-event": "task.create" } });
            expects(result).to.be.an('object');

            var result = Zap.action_item_catch_hook({ cleaned_request: data, headers: { "x-wisembly-event": "task.edit" } });
            expects(result).to.be.an('object');
        });

        it('should transform hook sent data into something usable in Zapier', function () {
            var result = Zap.action_item_catch_hook({ cleaned_request: data, headers: {} });
            expects(result).to.be.an('object');
            expects(result.action_item_name).to.be('Et cette tâchinette ?');
            expects(result.created_at).to.be('2015-07-10T16:54:59+00:00');
            expects(result.due_for).to.be('2015-07-13T17:00:00+00:00');
            expects(result.action_item_context).to.be('Grosse grosse note');
            expects(result.sender.name).to.be('Guillaume Potier');
            expects(result.assignees_names).to.be('Romain David, Andreï Vestemeanu');
            expects(result.meeting_url).to.be('https://solid.wisembly.com/meetings/Fe29206');
            expects(result.due_meeting_url).to.be('https://solid.wisembly.com/meetings/y4821f2');
        });

        it('should handle due_for', function () {
            var result = Zap.action_item_catch_hook({ cleaned_request: data, headers: {} });
            expects(result.due_for).to.be('2015-07-13T17:00:00+00:00');
            data.task.due_date = '2020-07-13T17:00:00+00:00'
            data.task.due_meeting = null;
            var result = Zap.action_item_catch_hook({ cleaned_request: data, headers: {} });
            expects(result.due_for).to.be(data.task.due_date);
        });
    });
});
