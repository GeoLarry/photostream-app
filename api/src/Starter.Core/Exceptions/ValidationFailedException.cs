namespace Starter.Core.Exceptions;

// Thrown by services for invalid input or a broken business rule.
// Endpoints turn it into 400 Bad Request with the message as the body.
public class ValidationFailedException(string message) : Exception(message);
