
package com.vtrustx.sdk.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.vtrustx.sdk.models.NativeSurveyDefinition
import com.vtrustx.sdk.models.SurveyScreen

@Composable
fun ScreenView(
    screen: SurveyScreen,
    definition: NativeSurveyDefinition,
    answers: Map<String, Any>,
    onAnswerChanged: (String, Any) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(android.graphics.Color.parseColor(definition.theme.backgroundColor)))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            screen.title?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.headlineLarge,
                    color = Color(android.graphics.Color.parseColor(definition.theme.primaryColor))
                )
            }
        }
        
        items(screen.components) { component ->
            ComponentView(
                component = component,
                answer = answers[component.id],
                onAnswerChanged = { onAnswerChanged(component.id, it) }
            )
        }
    }
}
