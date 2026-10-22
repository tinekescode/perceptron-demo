package nl.perceptron;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.path.json.JsonPath;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * MNIST is not loaded in tests (see application.properties), so this covers everything
 * that works on the untrained network.
 */
@QuarkusTest
class DigitsResourceTest {

    @Test
    void statusDescribesTheNetwork() {
        given()
                .when().get("/digits/status")
                .then()
                .statusCode(200)
                .body("dataStatus", is("disabled"))
                .body("architecture", is("784-64-10"))
                .body("training", is(false))
                .body("examplesSeen", is(0));
    }

    @Test
    void predictReturnsTenProbabilities() {
        JsonPath json = given()
                .contentType(ContentType.JSON)
                .body(Map.of("pixels", Collections.nCopies(Mnist.PIXELS, 0.5)))
                .when().post("/digits/predict")
                .then()
                .statusCode(200)
                .body("probabilities", hasSize(10))
                .body("hidden", hasSize(64))
                .extract().jsonPath();

        List<Float> probabilities = json.getList("probabilities", Float.class);
        assertEquals(1.0, probabilities.stream().mapToDouble(Float::doubleValue).sum(), 1e-5);
    }

    @Test
    void predictRejectsWrongSize() {
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("pixels", List.of(0.0, 1.0)))
                .when().post("/digits/predict")
                .then()
                .statusCode(400);
    }

    @Test
    void hiddenReturnsOneImagePerNeuron() {
        given()
                .when().get("/digits/hidden")
                .then()
                .statusCode(200)
                .body("side", is(28))
                .body("neurons", hasSize(64))
                .body("neurons[0]", hasSize(Mnist.PIXELS));
    }

    @Test
    void trainingNeedsData() {
        given()
                .when().post("/digits/train")
                .then()
                .statusCode(409)
                .body("error", is("MNIST is not loaded (disabled)"));
    }
}
