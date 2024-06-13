import express from "express";
import { JSONFilePreset } from "lowdb/node";
const app = express();
const port = 3000;
let db = null;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const koResponse = {
  response_type: "in_channel",
  text: "Wrong command usage",
};

const getDb = async () => {
  if (db === null) {
    db = await JSONFilePreset("db.json", { queue: [] });
  }

  return db;
};

app.post("/vyg-queue", async (req, res) => {
  if (req.body.channel_name !== "voyager-ui-deploy-queue-spa") {
    res.json(koResponse);
  }

  const formatedText = req.body.text.trim();
  const action = formatedText.split(" ")[0];
  const name = formatedText.split(" ")[1];

  if (!name && !["list", "clear", "finished"].includes(action)) {
    res.json(koResponse);
  }

  if (!["add", "list", "remove", "clear", "finished"].includes(action)) {
    res.json(koResponse);
  }

  let text = "";

  switch (action) {
    case "add":
      text = await add(name);
      break;
    case "list":
      text = await list();
      break;
    case "remove":
      text = await remove(name);
      break;
    case "clear":
      text = await clear();
      break;
    case "finished":
      text = await finished();
      break;

    default:
      break;
  }

  return res.json({
    response_type: "in_channel",
    blocks: text,
  });
});

const list = () => {
  return [getList()];
};

const getList = () => {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: 
        db.data.queue.length > 0
          ? `Queue is\n ${db.data.queue.map((item, i) => `${i+1}. ${item}\n`)}`
          : "List is empty",
    },
  };
};

const add = async (name) => {
  await db.update(({ queue }) => queue.push(name));
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${name} has been added`,
      },
    },
    getList(),
  ];
};

const remove = async (name) => {
  const newQueue = db.data.queue.filter((item) => item !== name);
  db.data.queue = newQueue;
  await db.write();
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${name} has been removed`,
      },
    },
    getList(),
  ];
};

const clear = async () => {
  await db.update(({ queue }) => {
    queue.length = 0;
    return queue;
  });
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `List is empty`,
      },
    },
  ];
};

const finished = async () => {
  await db.update(({ queue }) => queue.shift());
  const nextMessage = db.data.queue[0]
    ? `@${db.data.queue[0]} is next !`
    : "Queue is empty";
  const sl = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: nextMessage,
      },
    }
  ];
  if (db.data.queue.length > 0) {
    sl.push(getList());
  }
  return sl;
};

app.listen(port, async () => {
  await getDb();
  console.log(`Example app listening on port ${port}`);
});
