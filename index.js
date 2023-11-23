const express = require("express"),
	app = express(),
	http = require("http"),
	server = http.createServer(app),
	socket = require("socket.io"),
	io = socket(server),
	bodyParser = require("body-parser"),
	moment = require("moment"),
	prettyBytes = require("pretty-bytes");

require("moment-duration-format");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname));
server.listen(() => console.log("Server Is Running"));

let watching = 0;
io.on("connection", (s) => {
	console.log(s.id + "• User Connected");
	watching++;
	s.on("disconnect", () => {
		console.log("User Disconnected " + s.id);
		watching--;
	});
});

const { Client, Intents } = require("discord.js"),
	client = new Client({ intents: [Intents.FLAGS.GUILDS] }),
	config = require("./config.js"),
	{ Manager } = require("erela.js");

client.manager = new Manager({
	nodes: config.nodes,
	send: (id, payload) => {
		const g = client.guilds.cache.get(id);
		if (g) g.shard.send(payload);
	},
});
client.login(process.env.t);

client.on("ready", (c) => {
	console.log(c.user.tag + " ready");
	client.manager.init(c.user.id);
	setInterval(() => {
		let stats = getStat(client);
		io.emit("test", {
			message: `${stats.join("\n\n")}`,
			footer: `${watching} users online`,
		});
	}, 1000);
});

client.on("debug", (m) => {
	if (m.includes("Hit a 429")) return process.kill(1);
});
client.manager.on("nodeConnect", (n) =>
	console.log(`Node "${n.options.identifier}" connected.`)
);
client.manager.on("nodeError", (n, e) =>
	console.log(`Node "${n.options.identifier}" nodeError: ${e.message}.`)
);
client.on("raw", (d) => client.manager.updateVoiceState(d));

function getStat(c) {
	let allStats = [
		`<table>`,
		`<tr><th>Name</th><th>Status</th><th>Players</th><th>Uptime</th><th>Memory Usage</th><th>Free</th><th>Cores</th><th>System Load</th><th>Node Load</th></tr>`,
	];

	c.manager.nodes.forEach((n) => {
		if (n.connected) {
			allStats.push(
				`<tr id="Info">
					<td>${n.options.identifier}</td>
					<td class="alive">Online</td>
					<td>[${n.stats.playingPlayers}/${n.stats.players}]</td>
					<td>${moment
					.duration(n.stats.uptime)
					.format("d[d] h[h] m[m] s[s]")}</td>
					<td>${prettyBytes(n.stats.memory.used)}/${prettyBytes(
						n.stats.memory.reservable
					)}</td>
					<td>${prettyBytes(n.stats.memory.free)}/${prettyBytes(
						n.stats.memory.allocated
					)}</td>
					<td>${n.stats.cpu.cores} Core(s)</td>
					<td>${(Math.round(n.stats.cpu.systemLoad * 100) / 100).toFixed(
						2
					)}%</td>
					<td>${(Math.round(n.stats.cpu.lavalinkLoad * 100) / 100).toFixed(
						2
					)}%</td>
				</tr>`
			);
		}
	});

	c.manager.nodes.forEach((n) => {
		if (!n.connected) {
			allStats.push(
				`<tr id="Info">
					<td>${n.options.identifier}</td>
					<td class="dead">Offline</td>
				<td class="text-skeleton"></td>
		<td class="text-skeleton"></td>
	<td class="text-skeleton"></td>
 <td class="text-skeleton"></td>
 <td class="text-skeleton"></td>
 <td class="text-skeleton"></td>
 <td class="text-skeleton"></td>
				</tr>`
			);
		}
	});

	allStats.push(`</table>`);
	return allStats;
}
