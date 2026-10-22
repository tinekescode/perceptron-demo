package nl.perceptron;

import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

@Path("/digits")
@Produces(MediaType.APPLICATION_JSON)
public class DigitsResource {

    @Inject
    DigitTrainer trainer;

    @GET
    @Path("/status")
    public TrainingStatus status() {
        return trainer.status();
    }

    /**
     * Starts training a fresh network in the background. Poll {@code /status} to follow it.
     * {@code slow=true} pauses between batches so the audience can watch it learn.
     */
    @POST
    @Path("/train")
    public Response train(@QueryParam("epochs") @DefaultValue("1") int epochs,
                          @QueryParam("slow") @DefaultValue("false") boolean slow) {
        if (epochs < 1 || epochs > 20) {
            throw new BadRequestException("epochs must be between 1 and 20");
        }
        whenLoaded(() -> {
            trainer.start(epochs, slow);
            return null;
        });
        return Response.accepted(trainer.status()).build();
    }

    @POST
    @Path("/stop")
    public TrainingStatus stop() {
        trainer.stop();
        return trainer.status();
    }

    /**
     * Stops training and goes back to random weights.
     */
    @POST
    @Path("/reset")
    public TrainingStatus reset() {
        trainer.reset();
        return trainer.status();
    }

    @POST
    @Path("/predict")
    @Consumes(MediaType.APPLICATION_JSON)
    public PredictionResult predict(PredictRequest request) {
        if (request == null || request.pixels() == null || request.pixels().size() != Mnist.PIXELS) {
            throw new BadRequestException("Expected " + Mnist.PIXELS + " pixel values");
        }
        return trainer.predict(request.pixels().stream().mapToDouble(Double::doubleValue).toArray());
    }

    @GET
    @Path("/hidden")
    public HiddenWeights hidden() {
        return trainer.hiddenWeights();
    }

    /**
     * A test image with the network's answer: a random one, or the one at {@code index}.
     */
    @GET
    @Path("/sample")
    public TestImage sample(@QueryParam("index") Integer index) {
        try {
            return whenLoaded(() -> trainer.sample(index));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    @GET
    @Path("/mistakes")
    public List<TestImage> mistakes(@QueryParam("count") @DefaultValue("16") int count) {
        return whenLoaded(() -> trainer.mistakes(Math.clamp(count, 1, 100)));
    }

    /**
     * Turns "MNIST is not loaded" into 409 Conflict with the reason as JSON.
     */
    private static <T> T whenLoaded(Supplier<T> action) {
        try {
            return action.get();
        } catch (IllegalStateException e) {
            throw new WebApplicationException(Response.status(Response.Status.CONFLICT)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", e.getMessage()))
                    .build());
        }
    }
}
