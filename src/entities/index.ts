export class RMQObject {
    public vhost: string = "/";
    public objectType: "queue" | "exchange" | "binding";

    protected cluster?: Cluster;

    public setCluster(cluster: Cluster): void {
        this.cluster = cluster;
    }
}

export interface Arguments {
    // tslint:disable-next-line:no-any
    [k: string]: any;
}
export interface QueueDefinition {
    name: string;
    vhost: string;
    durable: boolean;
    auto_delete: boolean;
    arguments: Arguments;
}

export class Queue extends RMQObject implements QueueDefinition {
    public name: string;
    public durable: boolean = true;
    public auto_delete: boolean = false;
    public arguments: Arguments = {};

    public constructor(name: string, opts?: Partial<Queue>) {
        super();
        this.name = name;
        this.objectType = "queue";

        if (opts) {
            if (opts.vhost) this.vhost = opts.vhost;
            if (opts.durable) this.durable = opts.durable;
            if (opts.auto_delete) this.auto_delete = opts.auto_delete;
            if (opts.arguments) this.arguments = opts.arguments;
        }
    }

    public static fromDefinition(def: QueueDefinition): Queue {
        return new Queue(def.name, { vhost: def.vhost, durable: def.durable, auto_delete: def.auto_delete, arguments: def.arguments });
    }

    public toDefinition(): QueueDefinition {
        return {
            name: this.name,
            durable: this.durable,
            auto_delete: this.auto_delete,
            vhost: this.vhost,
            arguments: this.arguments,
        };
    }
}

export type ExchangeType = "direct" | "topic" | "fanout" | "x-consistent-hash";
export interface ExchangeDefinition extends QueueDefinition {
    type: ExchangeType;
    internal: boolean;
}

export class Exchange extends Queue {
    public type: ExchangeType;
    public internal: boolean = false;

    public constructor(name: string, type: ExchangeType, opts?: Partial<ExchangeDefinition>) {
        super(name, opts);
        this.objectType = "exchange";
        this.type = type;
    }

    public static fromDefinition(def: ExchangeDefinition): Exchange {
        return new Exchange(def.name, def.type, def);
    }

    public toDefinition(): ExchangeDefinition {
        return {
            ...super.toDefinition(),
            type: this.type,
            internal: this.internal,
        };
    }

    public bindTo(other: Queue, opts?: BindingOptions): Binding {
        if (!this.cluster) throw new Error("Cannot add binding without cluster reference");

        return this.cluster.addBinding(this, other, opts);
    }
}
export interface BindingOptions {
    routing_key?: string | number;
    arguments?: Arguments;
}

export interface BindingDefinition {
    vhost: string;
    source: string;
    destination: string;
    destination_type: string;
    routing_key: string | number;
    arguments: Arguments;
}
export class Binding extends RMQObject implements BindingDefinition {
    public source: string;
    public sourceObject?: Queue | Exchange;
    public destination: string;
    public destinationObject?: Queue | Exchange;
    public destination_type: "queue" | "exchange";

    public routing_key: string | number = "";

    public arguments: Arguments = {};

    public constructor() {
        super();
        this.objectType = "binding";
    }

    public toDefinition(): BindingDefinition {
        return {
            vhost: this.vhost,
            source: this.source,
            destination: this.destination,
            destination_type: this.destination_type,
            routing_key: this.routing_key,
            arguments: this.arguments,
        };
    }
}
export class Cluster {
    public queues: { [name: string]: Queue } = {};
    public exchanges: { [name: string]: Exchange } = {};

    public bindings: Binding[] = [];

    public static loadClusterFromDefinitions(defn: {queues: QueueDefinition[]; exchanges: ExchangeDefinition[]; bindings: BindingDefinition[] }): Cluster {
        const c = new Cluster();

        for (const q of defn.queues) {
            c.addQueue(q);
        }

        for (const ex of defn.exchanges) {
            c.addExchange(ex);
        }

        for (const b of defn.bindings) {
            c.addBinding(
                c.exchanges[b.source] || b.source,
                (b.destination_type === "exchange" ? c.exchanges[b.destination] : c.queues[b.destination]) || b.destination,
                { routing_key: b.routing_key, arguments: b.arguments },
            );
        }

        return c;
    }

    public addQueue(name: string | QueueDefinition): Queue {
        let q;
        if (typeof name === "string") {
            if (this.queues[name]) throw new Error(`There is already a queue with the name ${name}`);
            q = new Queue(name);
        } else {
            if (this.queues[name.name]) throw new Error(`There is already a queue with the name ${name.name}`);
            q = Queue.fromDefinition(name);
        }

        q.setCluster(this);
        this.queues[q.name] = q;

        return q;
    }

    public addExchange(definition: ExchangeDefinition): Exchange;
    public addExchange(name: string, type: ExchangeType, opts?: ExchangeDefinition): Exchange;
    public addExchange(name: string | ExchangeDefinition, type?: ExchangeType, opts?: ExchangeDefinition): Exchange {
        let ex;
        if (typeof name === "string") {
            if (this.exchanges[name]) throw new Error(`There is already an exchange with the name ${name}`);
            ex = new Exchange(name, type as ExchangeType, opts);
        } else {
            if (this.exchanges[name.name]) throw new Error(`There is already a queue with the name ${name.name}`);
            ex = Exchange.fromDefinition(name);
        }

        ex.setCluster(this);
        this.exchanges[ex.name] = ex;

        return ex;
    }

    public addBinding(source: string | Exchange, destination: string | Queue, opts?: BindingOptions | string): Binding {
        let destinationType: string;
        if (typeof opts === "string") {
            destinationType = opts;
        } else if (destination instanceof Queue) {
            destinationType = destination.objectType;
        } else {
            throw new Error("Unknown destination type for binding");
        }

        const binding = new Binding();
        if (typeof source === "string") {
            binding.source = source;
            binding.sourceObject = this.exchanges[binding.source];
        } else if (source instanceof Exchange) {
            binding.sourceObject = source;
            binding.source = source.name;
        }

        if (!binding.sourceObject) {
            throw new Error(`Unknown source for binding ${source}`);
        }

        if (typeof destination === "string") {
            binding.destination = destination;
            binding.destinationObject = (destinationType === "exchange") ? this.exchanges[binding.destination] : this.queues[binding.destination];
        } else if (destination instanceof Queue) {
            binding.destinationObject = destination;
            binding.destination = destination.name;
        }

        if (!binding.destinationObject) {
            throw new Error(`Unknown destination for binding ${destination}`);
        }

        binding.destination_type = destinationType as "queue";

        binding.setCluster(this);

        for (const b of this.bindings) {
            if (b.source === binding.source && b.destination === binding.destination && b.destination_type === binding.destination_type) {
                throw new Error(`Binding from ${source} to ${destinationType} ${destination} already exists`);
            }
        }

        this.bindings.push(binding);

        return binding;
    }

    public generateConfig(): object {
        return {
            queues: Object.keys(this.queues).map((qName: string) => this.queues[qName].toDefinition()),
            exchanges: Object.keys(this.exchanges).map((exName: string) => this.exchanges[exName].toDefinition()),
            bindings: this.bindings.map((b: Binding) => b.toDefinition()),
        };
    }
}
