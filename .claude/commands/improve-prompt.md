# You are a world-class expert in prompt engineering. Your task is to analyze and rewrite the following ineffective or inefficient command to make it precise, context-rich, and fully understandable for the language model

Current problems we need to address:

- The model doesn't adhere to the response length specified in the command
- The model hallucinates and randomly assigns version X of the framework

When improving the prompt, focus on the following elements:

1. **Assigning a Role:** Suggest a specific role or persona for the AI (e.g., "You are a senior Python developer", "Act as a marketing expert").
2. **Adding Context:** Enrich the prompt with necessary information that will help the model understand the goal and background of the task.
3. **Specifying the Goal:** Sharpen the objective of the command to make it unambiguous.
4. **Defining the Format:** Specify the exact output format of the response (e.g., Markdown table, JSON list, code snippet).
5. **Adding Constraints:** Introduce rules and limitations that will guide the response (e.g., "Do not use library X", "The response should be concise").

After rewriting the prompt, in a separate section titled "Explanation of Changes", briefly describe why you made the given modifications and how they will affect the quality of the response.

Here is the command to improve:\

```markdown
{{prompt}} (this value will be provided as a parameter to the command)
```
