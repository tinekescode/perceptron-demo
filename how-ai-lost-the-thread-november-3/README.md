# How AI Lost the Thread: 3 november (Nederlands)

De volledige talk in het Nederlands: alle slides, de speaker notes, de neuronsimulator en de oefentimer. Het origineel staat in [`how-ai-lost-the-thread`](../how-ai-lost-the-thread).

De drie live demo's op de slides zijn **in het Engels**: het zijn dezelfde apps als in de Engelse versie.

## Starten

Vanuit de repo-map, elk in een eigen terminal:

```shell
cd perceptron-demo && mvn quarkus:dev
```

```shell
cd perceptron-mlp && mvn quarkus:dev
```

```shell
cd perceptron-digits && mvn quarkus:dev
```

```shell
cd perceptron-frontend && npm run dev
```

```shell
npx --yes http-server@14.1.1 how-ai-lost-the-thread-november-3 -p 8092 -c-1 -s
```

| Open | Voor |
|---|---|
| http://localhost:8092/ | De talk |
| http://localhost:8092/?rehearse=35 | Oefenen voor 35 minuten |
| http://localhost:8092/?rehearse=50 | Oefenen voor 50 minuten |

De toetsen zijn hetzelfde als in de volledige talk, zie de [README](../how-ai-lost-the-thread/README.md).
