const cookieParser = require("cookie-parser");
const express = require("express");
const handlebars = require("express-handlebars");
const http = require("http");
const path = require("path");
const SocketServer = require("socket.io");

const Contenedor = require("./Contenedor");
const Chat = require("./Chat");
const sessions = require("./sessions");
const userHandler = require("./userHandler");

const app = express();
const server = http.Server(app);
const socketIO = SocketServer(server);

const TEMPLATER_ENGINE = "hbs";
const PORT = process.env.PORT || 8080;
const PUBLIC_PATH = path.join(__dirname, "public");
const VIEWS_PATH = path.join(__dirname, "./views", TEMPLATER_ENGINE);
const LAYOUTS_PATH = path.join(VIEWS_PATH, "layouts");
const PARTIALS_PATH = path.join(VIEWS_PATH, "layouts");

const contenedor = new Contenedor();
const chat = new Chat();

/**
 * SERVIDO DE ARCHIVOS PÚBLICOS.
 */
app.use("/public", express.static(PUBLIC_PATH));

/**
 * CONTROL DE SESIÓN.
 */
app.use(cookieParser());
app.use(express.urlencoded());
app.use(sessions);
app.get("/login", (req, res) => res.render("login"));
app.post("/login", userHandler.handleLogin);
app.get("/logout", userHandler.handleLogout);
app.get("/login", (req, res) => res.render("login"));
app.get("*", userHandler.forceLogin);

/**
 * API DE PRODUCTOS.
 */
const routerProductos = require("./routerProductos");
app.use("/api/productos", routerProductos);
app.use("/api/productos-test", (req, res) => {
  res.json(contenedor.getFakeProducts(5));
});

/**
 * CONFIGURACIÓN DE VISTAS (handlebars).
 */
app.use(express.urlencoded({ extend: true }));
app.set(`views`, VIEWS_PATH);
app.set(`view engine`, TEMPLATER_ENGINE);
if (TEMPLATER_ENGINE === "hbs") {
  app.engine(
    `hbs`,
    handlebars.engine({
      extname: ".hbs",
      layoutsDir: LAYOUTS_PATH,
      partialsDir: PARTIALS_PATH,
    })
  );
}

/**
 * CONTROL DE PRODUCTOS.
 */
app.get("/productos", async (req, res) => {
  const productos = await contenedor.getAll();
  const hayProductos = productos.length > 0;
  res.render("datos", { productos, hayProductos });
});

app.post("/productos", async (req, res) => {
  const { title, price, thumbnail } = req.body;
  if (
    typeof title !== "undefined" &&
    typeof price !== "undefined" &&
    typeof thumbnail !== "undefined"
  ) {
    await contenedor.save(title, price, thumbnail);
  }
  const products = await contenedor.getAll();
  socketIO.sockets.emit("products", products);
  res.redirect("/productos");
});
app.get("*", (req, res) => {
  const { username } = userHandler.get(req);
  res.render("formulario", { username });
});

/**
 * CONTROL DE SOCKET.IO.
 */
socketIO.on("connection", async (socket) => {
  const productos = await contenedor.getAll();
  socket.emit("products", productos);

  const chats = await chat.getAllNormalized();
  socket.emit("chats", chats);

  socket.on("chats", async (data) => {
    const { author, text } = data;
    await chat.addMessage(author, text);
    const chats = await chat.getAllNormalized();
    socket.emit("chats", chats);
  });
});
socketIO.on("error", (error) => console.log(error));

/**
 * INICIO DE SERVIDOR.
 */
const listeningServer = server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
listeningServer.on(`error`, (error) =>
  console.log(`Este es el error ${error}`)
);
