# Scriptkiddie Source

This is the repository for the Scriptkiddie source connector.

### Locally running the connector docker image

First, make sure you build the latest Docker image:

```
docker build . -t chandlerprall/source-scriptkiddie:dev
```

Then run any of the connector commands as follows:

```
docker run --rm chandlerprall/source-scriptkiddie:dev spec
docker run --rm -v $(pwd)/secrets:/secrets chandlerprall/source-scriptkiddie:dev check --config /secrets/config.json
docker run --rm -v $(pwd)/secrets:/secrets chandlerprall/source-scriptkiddie:dev discover --config /secrets/config.json
docker run --rm -v $(pwd)/secrets:/secrets -v $(pwd)/sample_files:/sample_files chandlerprall/source-scriptkiddie:dev read --config /secrets/config.json --catalog /sample_files/configured_catalog.json
```
