# burrow-builder

A tool to enable code driven rabbitmq configuration generation.

## Example

```javascript
const c = new Cluster();

const cx = c.addExchange("my.cx", "x-consistent-hash");
for (let i = 1; i < 4; i++) {
    const q = c.addQueue(`my.q${i}`);
    cx.bindTo(q, {routing_key: "10"});
}

console.log(JSON.stringify(c.generateConfig(), undefined, 2));
```

<details>
<summary>Generated Data </summary>

```json
{
  "queues": [
    {
      "name": "my.q0",
      "durable": true,
      "auto_delete": false,
      "vhost": "/",
      "arguments": {}
    },
    {
      "name": "my.q1",
      "durable": true,
      "auto_delete": false,
      "vhost": "/",
      "arguments": {}
    },
    {
      "name": "my.q2",
      "durable": true,
      "auto_delete": false,
      "vhost": "/",
      "arguments": {}
    }
  ],
  "exchanges": [
    {
      "name": "my.cx",
      "durable": true,
      "auto_delete": false,
      "vhost": "/",
      "arguments": {},
      "type": "x-consistent-hash",
      "internal": false
    }
  ],
  "bindings": [
    {
      "vhost": "/",
      "source": "my.cx",
      "destination": "my.q0",
      "destination_type": "queue",
      "routing_key": "",
      "arguments": {}
    },
    {
      "vhost": "/",
      "source": "my.cx",
      "destination": "my.q1",
      "destination_type": "queue",
      "routing_key": "",
      "arguments": {}
    },
    {
      "vhost": "/",
      "source": "my.cx",
      "destination": "my.q2",
      "destination_type": "queue",
      "routing_key": "",
      "arguments": {}
    }
  ]
}
```
</details>
