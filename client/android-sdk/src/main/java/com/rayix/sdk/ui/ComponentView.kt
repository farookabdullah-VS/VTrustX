
package com.vtrustx.sdk.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.vtrustx.sdk.models.SurveyComponent

@Composable
fun ComponentView(
    component: SurveyComponent,
    answer: Any?,
    onAnswerChanged: (Any) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .background(Color.White)
            .padding(16.dp)
    ) {
        Text(
            text = component.label,
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        when (component.type) {
            "text" -> {
                TextField(
                    value = (answer as? String) ?: "",
                    onValueChange = { onAnswerChanged(it) },
                    placeholder = { Text(component.placeholder ?: "Enter text...") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
            "multiline_text" -> {
                TextField(
                    value = (answer as? String) ?: "",
                    onValueChange = { onAnswerChanged(it) },
                    placeholder = { Text(component.placeholder ?: "Enter text...") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 120.dp),
                    minLines = 4,
                    maxLines = 8
                )
            }
            "number" -> {
                TextField(
                    value = when (val v = answer) {
                        is Double -> if (v == Math.floor(v) && !v.isInfinite()) v.toLong().toString() else v.toString()
                        else -> (v as? String) ?: ""
                    },
                    onValueChange = { text ->
                        val num = text.toDoubleOrNull()
                        if (num != null) onAnswerChanged(num)
                        else if (text.isEmpty()) onAnswerChanged("")
                    },
                    placeholder = { Text(component.placeholder ?: "Enter a number") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            "rating" -> {
                RatingView(
                    max = component.max?.toInt() ?: 5,
                    rating = ((answer as? Number)?.toInt()) ?: 0,
                    onRatingChanged = { onAnswerChanged(it) }
                )
            }
            "nps" -> {
                NPSView(
                    score = (answer as? Number)?.toInt(),
                    onScoreChanged = { onAnswerChanged(it) }
                )
            }
            "single_choice" -> {
                val selected = answer as? String
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    component.options?.forEach { option ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onAnswerChanged(option.value) }
                                .padding(vertical = 4.dp)
                        ) {
                            RadioButton(
                                selected = selected == option.value,
                                onClick = { onAnswerChanged(option.value) }
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(option.label)
                        }
                    }
                }
            }
            "multiple_choice" -> {
                @Suppress("UNCHECKED_CAST")
                val selectedList = (answer as? List<String>) ?: emptyList()
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    component.options?.forEach { option ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    val updated = if (selectedList.contains(option.value)) {
                                        selectedList - option.value
                                    } else {
                                        selectedList + option.value
                                    }
                                    onAnswerChanged(updated)
                                }
                                .padding(vertical = 4.dp)
                        ) {
                            Checkbox(
                                checked = selectedList.contains(option.value),
                                onCheckedChange = { checked ->
                                    val updated = if (checked) {
                                        selectedList + option.value
                                    } else {
                                        selectedList - option.value
                                    }
                                    onAnswerChanged(updated)
                                }
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(option.label)
                        }
                    }
                }
            }
            "date" -> {
                TextField(
                    value = (answer as? String) ?: "",
                    onValueChange = { onAnswerChanged(it) },
                    placeholder = { Text("YYYY-MM-DD") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            "slider" -> {
                val min = component.min?.toFloat() ?: 0f
                val max = component.max?.toFloat() ?: 100f
                val step = component.step?.toFloat() ?: 1f
                val currentValue = ((answer as? Number)?.toFloat()) ?: min
                Column {
                    Text(
                        text = currentValue.toLong().toString(),
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Slider(
                        value = currentValue,
                        onValueChange = { onAnswerChanged(it.toDouble()) },
                        valueRange = min..max,
                        steps = if (step > 0) ((max - min) / step).toInt() - 1 else 0,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(min.toLong().toString(), style = MaterialTheme.typography.bodySmall)
                        Text(max.toLong().toString(), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            "file_upload" -> {
                // Full implementation requires an Activity-level file picker from the parent
                OutlinedButton(
                    onClick = { /* Parent must provide file picker integration */ },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(if (answer != null) "File selected" else "Choose file...")
                }
            }
            else -> {
                Text(
                    text = "Component ${component.type} not implemented",
                    color = Color.Red
                )
            }
        }
    }
}

@Composable
fun RatingView(max: Int, rating: Int, onRatingChanged: (Int) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        for (i in 1..max) {
            Text(
                text = "\u2605",
                modifier = Modifier.clickable { onRatingChanged(i) },
                color = if (i <= rating) Color(0xFFFFD700) else Color.Gray,
                style = MaterialTheme.typography.headlineMedium
            )
        }
    }
}

@Composable
fun NPSView(score: Int?, onScoreChanged: (Int) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        for (i in 0..10) {
            Box(
                modifier = Modifier
                    .width(32.dp)
                    .height(32.dp)
                    .background(
                        color = if (score == i) MaterialTheme.colorScheme.primary else Color.LightGray.copy(alpha = 0.3f),
                        shape = MaterialTheme.shapes.small
                    )
                    .clickable { onScoreChanged(i) },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = i.toString(),
                    color = if (score == i) Color.White else Color.Black
                )
            }
        }
    }
}
