# Perceptron MLP

Hidden-layer network trained with backpropagation on **XOR**. Java 25+, Maven.

Sibling of `perceptron-demo` (AND, one node). XOR needs a hidden layer.

```shell
mvn quarkus:dev
```

http://localhost:8081 — then:

```shell
curl -X POST http://localhost:8081/perceptron/run
```

`mvn test` to run tests.
