import { Cluster } from "../entities";

const c = new Cluster();
const q1 = c.addQueue("test.queue");
c.addExchange("test.topic.exchange", "topic");
const e_direct = c.addExchange("test.direct.exchange", "direct");
const e_fanout = c.addExchange("test.fanout.exchange", "fanout");
c.addExchange("test.consistent-hash.exchange", "x-consistent-hash");

e_direct.bindTo(e_fanout);
e_direct.bindTo(q1, { routing_key: "10" });

// tslint:disable-next-line:no-console no-magic-numbers
console.log(JSON.stringify(c.generateConfig(), undefined, 2));
