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
    void runTrainsAndGateAndReturnsPredictions() {
        given()
                .when().post("/perceptron/run")
                .then()
                .statusCode(200)
                .body("gate", is("AND"))
                .body("learned", is(true))
                .body("predictions", hasSize(4))
                .body("predictions[0].expected", is(0))
                .body("predictions[0].predicted", is(0))
                .body("predictions[0].correct", is(true))
                .body("predictions[1].expected", is(0))
                .body("predictions[1].predicted", is(0))
                .body("predictions[1].correct", is(true))
                .body("predictions[2].expected", is(0))
                .body("predictions[2].predicted", is(0))
                .body("predictions[2].correct", is(true))
                .body("predictions[3].expected", is(1))
                .body("predictions[3].predicted", is(1))
                .body("predictions[3].correct", is(true));
    }

    @Test
    void runReturnsEveryTrainingStep() {
        JsonPath json = given()
                .when().post("/perceptron/run")
                .then()
                .statusCode(200)
                .extract().jsonPath();

        int epochs = json.getInt("epochsTrained");
        List<Map<String, Object>> history = json.getList("history");

        assertEquals(2, json.getList("initialWeights").size());
        assertEquals(4 * epochs, history.size());
        assertEquals(1, json.getInt("history[0].epoch"));
        assertEquals(0, json.getInt("history[0].example"));
        assertEquals(json.getList("weights"), json.getList("history[-1].weights"));
        assertEquals(json.getDouble("bias"), json.getDouble("history[-1].bias"));
    }
}
