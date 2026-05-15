console.log("SERVER NUEVO");

const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/

const SECRET = "clave_super_secreta_123";
const USER = "admin";
const PASS = "admin1234";

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "No autorizado"
    });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Token inválido o expirado"
    });
  }
}

/*
|--------------------------------------------------------------------------
| PATHS
|--------------------------------------------------------------------------
*/

const DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");
const PRODUCTS_PATH = path.join(DATA_DIR, "productos.json");

/*
|--------------------------------------------------------------------------
| CREAR CARPETAS SI NO EXISTEN
|--------------------------------------------------------------------------
*/

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

if (!fs.existsSync(PRODUCTS_PATH)) {
  fs.writeFileSync(PRODUCTS_PATH, "[]", "utf8");
}

/*
|--------------------------------------------------------------------------
| MULTER
|--------------------------------------------------------------------------
*/

const storage = multer.memoryStorage();

const upload = multer({
  storage
});

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safe(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_-]/g, "");
}

/*
|--------------------------------------------------------------------------
| STATIC FILES
|--------------------------------------------------------------------------
*/

app.use("/public", express.static(PUBLIC_DIR));

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

app.post("/api/login", (req, res) => {
  const { user, pass } = req.body;

  if (user === USER && pass === PASS) {
    const token = jwt.sign({ user }, SECRET, { expiresIn: "2h" });

    return res.json({
      success: true,
      token
    });
  }

  return res.status(401).json({
    success: false,
    error: "Credenciales incorrectas"
  });
});

/*
|--------------------------------------------------------------------------
| RUTAS HTML
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "editor.html"));
});

app.get("/editor.html", (req, res) => {
  res.sendFile(path.join(__dirname, "editor.html"));
});

/*
|--------------------------------------------------------------------------
| API PRODUCTOS
|--------------------------------------------------------------------------
*/

app.get("/api/productos", authMiddleware, (req, res) => {
  try {
    const raw = fs.readFileSync(PRODUCTS_PATH, "utf8");
    const data = JSON.parse(raw);

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "No se pudo leer productos.json"
    });
  }
});

app.post("/api/productos", authMiddleware, (req, res) => {
  try {
    fs.writeFileSync(
      PRODUCTS_PATH,
      JSON.stringify(req.body, null, 2),
      "utf8"
    );

    res.json({
      success: true
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "No se pudo guardar productos.json"
    });
  }
});

/*
|--------------------------------------------------------------------------
| API UPLOAD
|--------------------------------------------------------------------------
*/

app.post(
  "/api/upload",
  authMiddleware,
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "gallery", maxCount: 20 }
  ]),
  async (req, res) => {
    try {
      const id = safe(req.body.id);
      const subcategory = safe(req.body.subcategory);

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "ID requerido"
        });
      }

      const folder = path.join(
        PUBLIC_DIR,
        "images",
        subcategory || "productos",
        id
      );

      ensureDir(folder);

      let coverPath = "";
      const galleryPaths = [];

      const coverFile = req.files?.cover?.[0];

      if (coverFile) {
        const ext = path.extname(coverFile.originalname).toLowerCase() || ".webp";
        const filename = `cover${ext}`;

        fs.writeFileSync(path.join(folder, filename), coverFile.buffer);

        coverPath = `/public/images/${subcategory || "productos"}/${id}/${filename}`;
      }

      const gallery = req.files?.gallery || [];

      gallery.forEach((file, index) => {
        const ext = path.extname(file.originalname).toLowerCase() || ".webp";
        const filename = `${index + 1}${ext}`;

        fs.writeFileSync(path.join(folder, filename), file.buffer);

        galleryPaths.push(
          `/public/images/${subcategory || "productos"}/${id}/${filename}`
        );
      });

      const existingFiles = fs.readdirSync(folder);

      if (!coverPath) {
        const existingCover = existingFiles.find(file => file.startsWith("cover"));

        if (existingCover) {
          coverPath = `/public/images/${subcategory || "productos"}/${id}/${existingCover}`;
        }
      }

      if (!galleryPaths.length) {
        existingFiles
          .filter(file => !file.startsWith("cover"))
          .sort()
          .forEach(file => {
            galleryPaths.push(
              `/public/images/${subcategory || "productos"}/${id}/${file}`
            );
          });
      }

      res.json({
        success: true,
        media: {
          cover: coverPath,
          gallery: galleryPaths
        }
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        error: "Error subiendo imágenes"
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| START
|--------------------------------------------------------------------------
*/

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});