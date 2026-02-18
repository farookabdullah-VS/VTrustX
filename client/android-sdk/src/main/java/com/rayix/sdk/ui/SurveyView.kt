
package com.vtrustx.sdk.ui

import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.vtrustx.sdk.engine.SurveyEngine
import com.vtrustx.sdk.models.NativeSurveyDefinition

@Composable
fun SurveyView(
    definition: NativeSurveyDefinition,
    onComplete: (Map<String, Any>) -> Unit = {},
    onCancel: () -> Unit = {}
) {
    val engine = remember { SurveyEngine(definition) }
    var currentScreenId by remember { mutableStateOf(definition.screens.firstOrNull()?.id) }
    // Use immutable map and reassign to trigger recomposition
    var answers by remember { mutableStateOf(mapOf<String, Any>()) }
    var isComplete by remember { mutableStateOf(false) }

    val currentScreen = definition.screens.find { it.id == currentScreenId }

    // Fire onComplete callback when survey finishes
    LaunchedEffect(isComplete) {
        if (isComplete) {
            onComplete(answers)
        }
    }

    // Validate required fields on current screen before enabling Next
    val canProceed = remember(currentScreenId, answers) {
        if (currentScreenId == null) true
        else engine.validateScreen(currentScreenId!!, answers)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(definition.title) },
                navigationIcon = {
                    IconButton(onClick = onCancel) {
                        Icon(Icons.Default.Close, contentDescription = "Cancel survey")
                    }
                },
                colors = TopAppBarDefaults.smallTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        },
        bottomBar = {
            if (currentScreen != null && !isComplete) {
                BottomAppBar {
                    Spacer(Modifier.weight(1f))
                    Button(
                        onClick = {
                            val nextId = engine.getNextScreen(currentScreenId!!, answers)
                            if (nextId != null) {
                                currentScreenId = nextId
                            } else {
                                isComplete = true
                                currentScreenId = null
                            }
                        },
                        enabled = canProceed,
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text("Next")
                    }
                }
            }
        }
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            if (!isComplete && currentScreen != null) {
                ScreenView(
                    screen = currentScreen,
                    definition = definition,
                    answers = answers,
                    onAnswerChanged = { id, value ->
                        // Reassign to new map to trigger recomposition
                        answers = (answers + (id to value))
                    }
                )
            } else {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = androidx.compose.ui.Alignment.Center
                ) {
                    Text(
                        text = "Survey Complete! Thank you.",
                        style = MaterialTheme.typography.displayMedium
                    )
                }
            }
        }
    }
}
