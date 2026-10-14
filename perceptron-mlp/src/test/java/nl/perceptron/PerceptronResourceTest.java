package nl.perceptron;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.hasSize;

@QuarkusTest
class PerceptronResourceTest {

    @Test
    void runTrainsXorNetworkAndReturnsPredictions() {
        given()
                .when().post("/perceptron/run")
                .then()
                .statusCode(200)
                .body("gate", is("XOR"))
                .body("architecture", is("2-4-1"))
                .body("learned", is(true))
                .body("predictions", hasSize(4))
                .body("predictions[0].expected", is(0))
                .body("predictions[0].predicted", is(0))
                .body("predictions[0].correct", is(true))
                .body("predictions[1].expected", is(1))
                .body("predictions[1].predicted", is(1))
                .body("predictions[1].correct", is(true))
                .body("predictions[2].expected", is(1))
                .body("predictions[2].predicted", is(1))
                .body("predictions[2].correct", is(true))
                .body("predictions[3].expected", is(0))
                .body("predictions[3].predicted", is(0))
                .body("predictions[3].correct", is(true));
    }

    @Test
    void runReturnsSnapshotPerEpoch() {
        JsonPath json = given()
                .when().post("/perceptron/run")
                .then()
                .statusCode(200)
                .extract().jsonPath();

        int epochs = json.getInt("epochsTrained");
        List<Map<String, Object>> history = json.getList("history");

        assertEquals(epochs + 1, history.size());
        assertEquals(0, json.getInt("history[0].epoch"));
        assertEquals(epochs, json.getInt("history[-1].epoch"));
        assertEquals(4, json.getList("history[0].weightsInputHidden").size());
        assertEquals(json.getDouble("biasOutput"), json.getDouble("history[-1].biasOutput"));
        assertEquals(json.getDouble("averageLoss"), json.getDouble("history[-1].averageLoss"));
    }
}
