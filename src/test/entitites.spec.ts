//tslint:disable:no-any 
// tslint:disable-next-line:no-implicit-dependencies
import { expect } from "chai";

import * as entities from "../entities";

describe("Cluster", () => {
    it("should allow a user to add a queue to the config", () => {
        const c = new entities.Cluster();

        c.addQueue("my-queue");

        expect(c.queues["my-queue"]).to.be.an.instanceOf(entities.Queue);
    });

    it("should throw an error when an existing queue is added to the config", () => {
        const c = new entities.Cluster();

        c.addQueue("my-queue");

        expect(() => {
            c.addQueue("my-queue");
        }).to.throw();
    });

    it("should allow a user to add a exchange to the config", () => {
        const c = new entities.Cluster();

        c.addExchange("my-exchange", "topic");

        expect(c.exchanges["my-exchange"]).to.be.an.instanceOf(entities.Exchange);
    });

    it("should throw an error when an existing exchange is added to the config", () => {
        const c = new entities.Cluster();

        c.addExchange("my-exchange", "topic");

        expect(() => {
            c.addExchange("my-exchange", "topic");
        }).to.throw();
    });

    it("should allow a user to add a binding to the cluster", () => {
        const c = new entities.Cluster();

        const ex = c.addExchange("my-exchange", "topic");
        const q = c.addQueue("my-queue");

        c.addBinding(ex, q);
        expect(c.bindings[0]).to.be.an.instanceOf(entities.Binding);
    });

    it("should throw an error when an existing binding is added to the cluster", () => {
        const c = new entities.Cluster();

        const ex = c.addExchange("my-exchange", "topic");
        const q = c.addQueue("my-queue");

        c.addBinding(ex, q);
        expect(() => {
            c.addBinding(ex, q);
        }).to.throw();
    });

    it("should generate the correct config for test system 1", () => {
        const c = new entities.Cluster();

        const ex = c.addExchange("myexchange", "topic");
        const q = c.addQueue("myqueue");
        c.addBinding(ex, q);

        expect(c.generateConfig()).to.eql({
            bindings: [
                {
                    arguments: {},
                    destination: "myqueue",
                    destination_type: "queue",
                    routing_key: "",
                    source: "myexchange",
                    vhost: "/",
                },
            ],
            exchanges: [
                {
                    arguments: {},
                    auto_delete: false,
                    durable: true,
                    internal: false,
                    name: "myexchange",
                    type: "topic",
                    vhost: "/",
                },
            ],
            queues: [
                {
                    arguments: {},
                    auto_delete: false,
                    durable: true,
                    name: "myqueue",
                    vhost: "/",
                },
            ],
        });
    });
});
