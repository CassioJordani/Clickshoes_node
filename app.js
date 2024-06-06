// Importações
const express = require('express');
const app = express();
const axios = require('axios');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { getApps, initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc } = require('firebase/firestore');

// Configurações
const port = 3000; // Porta do servidor
const firebaseConfig = {
    apiKey: "AIzaSyB3HsuYXEBZurfTkDHbctuwGdpYXsXwG-k",
    authDomain: "persistencia-455b1.firebaseapp.com",
    projectId: "persistencia-455b1",
    storageBucket: "persistencia-455b1.appspot.com",
    messagingSenderId: "178907863479",
    appId: "1:178907863479:web:b64e7dd906abbd7b663032"
};

// Inicialização do Firebase
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Configuração do armazenamento de arquivos de imagem com multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Configuração do middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'minha chave',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Defina como true se estiver usando HTTPS
}));

// Middleware para log de sessões e cookies
app.use((req, res, next) => {
    console.log('Cookies:', req.cookies);
    console.log('Sessão:', req.session);
    next();
});

// Configuração do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Json dos Produtos
const produtos = [
    { nome: 'bota coturno', preco: 122.90, categoria: 'bota', imagem: '/uploads/bota-coturno-preto.png' },
    { nome: 'bota couro democrata', preco: 298.68, categoria: 'bota', imagem: '/uploads/bota-couro-democrata.png' },
    { nome: 'chinelo aokley', preco: 94.99, categoria: 'chinelo', imagem: '/uploads/chinelo-oakley.png' },
    { nome: 'chinelo rider preto', preco: 49.99, categoria: 'chinelo', imagem: '/uploads/chinelo-rider-preto.png' },
    { nome: 'chuteira penalty', preco: 139.99, categoria: 'outro', imagem: '/uploads/chuteira-society-penalty.png' },
    { nome: 'havaianas slim', preco: 39.90, categoria: 'chinelo', imagem: '/uploads/havaianas-slim-organic.png' },
    { nome: 'sapatenis branco', preco: 250.90, categoria: 'sapatenis', imagem: '/uploads/sapatenis-casual.png' },
    { nome: 'sapatenis pegada couro', preco: 183.85, categoria: 'sapatenis', imagem: '/uploads/sapatenis-pegada-couro.png' },
    { nome: 'sapatenis pegada preto', preco: 148.59, categoria: 'sapatenis', imagem: '/uploads/sapatenis-pegada-preto.png' },
    { nome: 'tenis mizuno', preco: 349.90, categoria: 'sapatenis', imagem: '/uploads/tenis-mizuno-mirai.png' },
    { nome: 'tenis nike', preco: 219.90, categoria: 'tenis', imagem: '/uploads/tenis-nike.png' },
    { nome: 'tenis olypikus', preco: 299.90, categoria: 'tenis', imagem: '/uploads/tenis-olympikus-delta.png' },
];

// Array do carrinho de compras
const carrinho = [];

// Rotas
//Filter para escolher a categoria de produtos
app.get('/', (req, res) => {
    const categoriaSelecionada = req.query.categoria;
    const produtosFiltrados = categoriaSelecionada && categoriaSelecionada !== '0' 
        ? produtos.filter(produto => produto.categoria === categoriaSelecionada) 
        : produtos;
    res.render('index', { produtos: produtosFiltrados });
});

// Rota para adicionar um produto ao catálago
app.route('/add')
    .get((req, res) => res.render('add'))
    .post(upload.single('imagem'), (req, res) => {
        const { nome, preco, categoria } = req.body;
        const imagem = req.file ? '/uploads/' + req.file.filename : null;
        produtos.push({ nome, preco, categoria, imagem });
        res.redirect('/');
    });

// URL com nome do produto (detalhes do produto)
app.get('/produto/:nome', (req, res) => {
    const produto = produtos.find(p => p.nome === req.params.nome);
    res.render('produto', { produto });
});

// Remover um item do array (lista) de produtos (JSON)
app.post('/remover', (req, res) => {
    const index = produtos.findIndex(p => p.nome === req.body.nome);
    if (index !== -1) produtos.splice(index, 1);
    res.redirect('/');
});

// Adicionar um item do catálago ao carrinho de compras
app.post('/adicionar-ao-carrinho', (req, res) => {
    const { nome, quantidade } = req.body;
    const produto = produtos.find(p => p.nome === nome);
    if (produto) {
        const carrinho = req.cookies.carrinho || [];
        carrinho.push({ ...produto, quantidade: parseInt(quantidade) });
        res.cookie('carrinho', carrinho, { maxAge: 900000, httpOnly: true }); // Define o cookie com o carrinho atualizado
        res.redirect('/');
    } else {
        res.status(404).send('Produto não encontrado');
    }
});

app.get('/carrinho', (req, res) => {
    const carrinho = req.cookies.carrinho || [];
    res.render('carrinho', { carrinho });
});

app.post('/remover-do-carrinho', (req, res) => {
    let carrinho = req.cookies.carrinho || [];
    carrinho = carrinho.filter(item => item.nome !== req.body.nome);
    res.cookie('carrinho', carrinho, { maxAge: 900000, httpOnly: true });
    res.redirect('/carrinho');
});

// Firebase login e erros
app.route('/login')
    .get((req, res) => res.render('login'))
    .post(async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.send('<script>alert("Por favor, preencha todos os campos."); window.location="/login";</script>');
        }
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            req.session.userId = userCredential.user.uid; // Armazena o ID do usuário na sessão
            res.redirect('/home');
        } catch (error) {
            const message = error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password'
                ? 'Credenciais inválidas. Verifique seu email e senha.'
                : 'Ocorreu um erro durante o login.';
            return res.send(`<script>alert("${message}"); window.location="/login";</script>`);
        }
    });

// Redireciona à página inicial
app.get('/home', (req, res) => {
    if (req.session.userId) {
        const user = auth.currentUser;
        res.render('home', { user });
    } else {
        res.redirect('/login');
    }
});

// Rota para cadastrar um produto no estoque
app.route('/add-produto')
    .get((req, res) => res.render('add-produto'))
    .post(async (req, res) => {
        try {
            await addDoc(collection(db, 'produto'), {
                nome: req.body.nome,
                preco: req.body.preco,
                quantidade: req.body.quantidade,
                tamanho: req.body.tamanho
            });
            res.redirect('/list-produtos');
        } catch (e) {
            res.send(e.message);
        }
    });

// Estoque
// Mostra todos os registros de produtos do estoque
app.get('/list-produtos', async (req, res) => {
    const querySnapshot = await getDocs(collection(db, 'produto'));
    const produtos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.render('list-produtos', { produtos });
});

// Rota para editar e atualizar algum registro do banco de dados do estoque
app.route('/edit-produto/:id')
    .get(async (req, res) => {
        const docRef = doc(db, 'produto', req.params.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            res.render('edit-produto', { produto: { id: docSnap.id, ...docSnap.data() } });
        } else {
            res.send("Nao encontrado!");
        }
    })
    .post(async (req, res) => {
        const docRef = doc(db, 'produto', req.params.id);
        await updateDoc(docRef, {
            nome: req.body.nome,
            preco: req.body.preco,
            quantidade: req.body.quantidade,
            tamanho: req.body.tamanho
        });
        res.redirect('/list-produtos');
    });

// Deleta um registro do estoque
app.post('/delete-produto/:id', async (req, res) => {
    const docRef = doc(db, 'produto', req.params.id);
    await deleteDoc(docRef);
    res.redirect('/list-produtos');
});

// Iniciar servidor
app.listen(port, () => {
    console.log('Servidor rodando na porta', port);
});

// Para teste unitário
module.exports = app;
