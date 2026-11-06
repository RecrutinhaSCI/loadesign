-- Executado pelo entrypoint oficial do PostgreSQL somente na PRIMEIRA
-- inicialização do volume loadesign_local_pgdata.
-- Cria o banco de testes automatizados, separado do banco de desenvolvimento.
CREATE DATABASE loadesign_test OWNER loa_local;
