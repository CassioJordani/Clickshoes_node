const assert = require("assert");
const app = require('../app'); //arquivo import
const request = require('supertest'); 

describe('Página Principal', function () {
    it('Deve retornar status 200', function (done) {
        request(app)
            .get('/')
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
});

// Teste para adicionar produto ao catálogo
describe('Adicionar Imagem', function () {
    it('Deve fazer o upload de imagem', function (done) {
        request(app)
            .post('/add')
            .attach('imagem', 'public/uploads/tenis-nike.png') 
            .expect(302) // Redirecionamento
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
});


